package com.goreecloud.memos

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.DatabaseErrorHandler
import android.database.sqlite.SQLiteDatabaseCorruptException
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.util.UUID

/**
 * App-private, offline SQLite. No sync, no network, no external storage access.
 * Deletion is a reversible trash state, and edits retain local text history.
 * The database is not encrypted and has no cross-device merge capability.
 */
// Accept only a plain filename inside Android's app-private database directory.
// Explicitly reject separators, traversal, URIs and other external locations.
private fun checkedMemoDatabaseName(name: String): String {
    require(name.matches(Regex("[a-z][a-z0-9_-]{1,72}[.]sqlite3"))) {
        "Only an app-private SQLite database filename is permitted"
    }
    return name
}

// Android's default corruption callback can delete the affected SQLite file.
// This app has NO verified backup or restore path: preserve evidence and fail
// closed instead. Never log paths, record content or secrets in this callback.
private val preserveDamagedMemos = DatabaseErrorHandler {
    throw SQLiteDatabaseCorruptException(
        "Local memo storage is damaged. Automatic deletion is disabled; " +
        "do not clear app data or reinstall."
    )
}

class MemoStore(
    context: Context,
    databaseName: String = "goreecloud_memos_local_preview.sqlite3"
) : SQLiteOpenHelper(
    context.applicationContext, checkedMemoDatabaseName(databaseName), null, 1,
    preserveDamagedMemos
) {
    override fun onConfigure(db: SQLiteDatabase) {
        super.onConfigure(db)
        db.setForeignKeyConstraintsEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE memos (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                color TEXT NOT NULL,
                pinned INTEGER NOT NULL,
                archived INTEGER NOT NULL,
                deleted INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                version INTEGER NOT NULL CHECK(version >= 1)
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE revisions (
                memo_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                saved_at INTEGER NOT NULL,
                PRIMARY KEY (memo_id, version),
                FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX idx_memos_native_order ON memos(deleted, archived, pinned, updated_at)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Never use destructive DROP/RECREATE migrations for notes.
        throw IllegalStateException("No reviewed local Memos database migration for schema " + oldVersion)
    }

    private fun fromCursor(row: Cursor): Memo = Memo(
        id = row.getString(row.getColumnIndexOrThrow("id")),
        title = row.getString(row.getColumnIndexOrThrow("title")),
        content = row.getString(row.getColumnIndexOrThrow("content")),
        color = row.getString(row.getColumnIndexOrThrow("color")),
        pinned = row.getInt(row.getColumnIndexOrThrow("pinned")) != 0,
        archived = row.getInt(row.getColumnIndexOrThrow("archived")) != 0,
        deleted = row.getInt(row.getColumnIndexOrThrow("deleted")) != 0,
        createdAt = row.getLong(row.getColumnIndexOrThrow("created_at")),
        updatedAt = row.getLong(row.getColumnIndexOrThrow("updated_at")),
        version = row.getInt(row.getColumnIndexOrThrow("version"))
    )

    private fun getFrom(db: SQLiteDatabase, id: String): Memo? =
        db.query("memos", null, "id=?", arrayOf(id), null, null, null).use { rows ->
            if (rows.moveToFirst()) fromCursor(rows) else null
        }

    @Synchronized fun get(id: String): Memo? = getFrom(readableDatabase, id)

    @Synchronized fun list(): List<Memo> {
        val result = mutableListOf<Memo>()
        readableDatabase.rawQuery(
            "SELECT * FROM memos ORDER BY pinned DESC, updated_at DESC, id LIMIT 2000", null
        ).use { rows ->
            while (rows.moveToNext()) result += fromCursor(rows)
        }
        return result
    }

    private fun values(note: Memo): ContentValues = ContentValues().apply {
        put("id", note.id)
        put("title", note.title)
        put("content", note.content)
        put("color", note.color)
        put("pinned", if (note.pinned) 1 else 0)
        put("archived", if (note.archived) 1 else 0)
        put("deleted", if (note.deleted) 1 else 0)
        put("created_at", note.createdAt)
        put("updated_at", note.updatedAt)
        put("version", note.version)
    }

    @Synchronized fun save(
        previous: Memo?, title: String, content: String, color: String,
        pinned: Boolean, archived: Boolean, deleted: Boolean = false
    ): Memo {
        MemoLogic.validate(title, content, color)
        val db = writableDatabase
        db.beginTransaction()
        try {
            val now = System.currentTimeMillis()
            val result: Memo
            if (previous == null) {
                result = Memo(UUID.randomUUID().toString(), title, content, color,
                    pinned, archived, deleted, now, now, 1)
                db.insertOrThrow("memos", null, values(result))
            } else {
                val current = getFrom(db, previous.id)
                    ?: throw IllegalStateException("Memo no longer exists")
                if (current.version != previous.version)
                    throw IllegalStateException("Memo changed. Reopen it before saving.")
                if (current.title == title && current.content == content &&
                    current.color == color && current.pinned == pinned &&
                    current.archived == archived && current.deleted == deleted) {
                    db.setTransactionSuccessful()
                    return current
                }
                val history = ContentValues().apply {
                    put("memo_id", current.id)
                    put("version", current.version)
                    put("title", current.title)
                    put("content", current.content)
                    put("saved_at", now)
                }
                db.insertOrThrow("revisions", null, history)
                result = current.copy(
                    title = title, content = content, color = color,
                    pinned = pinned, archived = archived, deleted = deleted,
                    updatedAt = now, version = current.version + 1
                )
                val changed = db.update("memos", values(result), "id=? AND version=?",
                    arrayOf(previous.id, previous.version.toString()))
                if (changed != 1) throw IllegalStateException("Memo changed before save.")
            }
            db.setTransactionSuccessful()
            return result
        } finally {
            db.endTransaction()
        }
    }

    @Synchronized fun duplicate(source: Memo): Memo {
        val current = get(source.id) ?: throw IllegalStateException("Memo no longer exists")
        require(!current.deleted) { "Cannot duplicate a trashed memo" }
        return save(null, current.title, current.content, current.color,
            pinned = false, archived = false)
    }
}
