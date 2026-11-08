package com.goreecloud.memos

import android.content.ContentValues
import android.content.Context
import java.util.UUID

/**
 * INTERNAL, UNEXPOSED staged restore proof. NOT a backup or user restore.
 *
 * Writes only a NEW randomly named app-private SQLite file, never the current
 * Memos database. It must not be wired to the UI or a document provider until
 * the full consent, encryption, durability and rollback gates are qualified.
 * A successful stage remains an app-private PLAINTEXT file: callers must
 * explicitly manage lifecycle cleanup in a future reviewed restore workflow.
 */
internal data class StagedMemoSnapshot(
    val databaseName: String,
    val memoCount: Int,
    val revisionCount: Int
)

internal object MemoSnapshotStager {
    @Synchronized fun experimentalStage(
        context: Context,
        snapshot: MemoSnapshot
    ): StagedMemoSnapshot {
        // Reject unsupported data BEFORE creating a staging file.
        MemoSnapshotCodec.validate(snapshot)
        val app = context.applicationContext
        val name = "memos_stage_" + UUID.randomUUID().toString()
            .replace("-", "") + ".sqlite3"
        val path = app.getDatabasePath(name)
        val directory = path.parentFile ?: throw IllegalStateException(
            "App-private database directory is unavailable"
        )
        check(directory.isDirectory || directory.mkdirs()) {
            "App-private database directory cannot be created"
        }
        // Exclusive file creation prevents silent reuse/replacement, even
        // if unexpected file state occurs despite the random filename.
        check(path.createNewFile()) { "Refusing to overwrite an existing staged database" }

        val helper = MemoStore(app, name)
        var verified = false
        try {
            val db = helper.writableDatabase
            db.beginTransaction()
            try {
                snapshot.memos.forEach { memo ->
                    db.insertOrThrow("memos", null, ContentValues().apply {
                        put("id", memo.id)
                        put("title", memo.title)
                        put("content", memo.content)
                        put("color", memo.color)
                        put("pinned", if (memo.pinned) 1 else 0)
                        put("archived", if (memo.archived) 1 else 0)
                        put("deleted", if (memo.deleted) 1 else 0)
                        put("created_at", memo.createdAt)
                        put("updated_at", memo.updatedAt)
                        put("version", memo.version)
                    })
                }
                snapshot.revisions.forEach { rev ->
                    db.insertOrThrow("revisions", null, ContentValues().apply {
                        put("memo_id", rev.memoId)
                        put("version", rev.version)
                        put("title", rev.title)
                        put("content", rev.content)
                        put("saved_at", rev.savedAt)
                    })
                }
                db.setTransactionSuccessful()
            } finally {
                db.endTransaction()
            }
            // Reopen after closing the writer, then independently read back
            // every row, check SQLite integrity, foreign keys and exact data.
            helper.close()
            val checker = MemoStore(app, name)
            try {
                val reread = checker.experimentalReadCompleteSnapshot()
                check(reread == snapshot) {
                    "Staged snapshot failed full readback comparison"
                }
                checker.readableDatabase.rawQuery(
                    "PRAGMA integrity_check", null
                ).use { rows ->
                    check(rows.moveToFirst() && rows.getString(0) == "ok") {
                        "Staged SQLite integrity check failed"
                    }
                    check(!rows.moveToNext()) {
                        "Staged SQLite returned unexpected integrity results"
                    }
                }
            } finally {
                checker.close()
            }
            verified = true
            return StagedMemoSnapshot(name, snapshot.memos.size, snapshot.revisions.size)
        } finally {
            helper.close()
            if (!verified) {
                // Only the brand-new generated file can ever be removed by
                // this failure path. Never delete the existing user DB.
                app.deleteDatabase(name)
                check(!path.exists()) {
                    "Incomplete synthetic staging file could not be removed"
                }
            }
        }
    }
}
