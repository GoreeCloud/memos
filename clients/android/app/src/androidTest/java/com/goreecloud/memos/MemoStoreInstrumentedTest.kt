package com.goreecloud.memos

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.FileInputStream

/**
 * Synthetic, destructive test data ONLY in an attested disposable emulator.
 * NEVER run against an attached physical phone or existing personal notes.
 */
@RunWith(AndroidJUnit4::class)
class MemoStoreInstrumentedTest {
    private lateinit var databaseName: String
    private lateinit var context: Context
    private lateinit var store: MemoStore

    @Before fun createOnlyInEmulator() {
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        val descriptor = automation.executeShellCommand("getprop ro.kernel.qemu")
        val property = descriptor.use {
            FileInputStream(it.fileDescriptor).bufferedReader().use { reader ->
                reader.readText().trim()
            }
        }
        check(property == "1") {
            "BLOCK: synthetic SQLite test refuses a non-emulator Android target"
        }
        check(InstrumentationRegistry.getArguments()
            .getString("goreecloudDisposable") == "1") {
            "BLOCK: synthetic SQLite test requires explicit disposable-emulator opt-in"
        }
        context = InstrumentationRegistry.getInstrumentation().targetContext
        check(context.packageName == "com.goreecloud.memos")
        databaseName = "memos_qa_" + java.util.UUID.randomUUID().toString()
            .replace("-", "") + ".sqlite3"
        // Do not read, open or delete the user's default local memo database.
        store = MemoStore(context, databaseName)
    }

    @After fun removeSyntheticData() {
        if (::store.isInitialized) {
            store.close()
            check(context.deleteDatabase(databaseName)) {
                "Failed to remove isolated synthetic SQLite database"
            }
        }
    }

    private fun create(
        title: String = "Synthetic Title",
        content: String = "Synthetic memo #testing",
        color: String = "paper",
        pinned: Boolean = false,
        archived: Boolean = false
    ) = store.save(null, title, content, color, pinned, archived)

    private fun revisionCount(memoId: String): Int {
        store.readableDatabase.rawQuery(
            "SELECT count(*) FROM revisions WHERE memo_id=?", arrayOf(memoId)
        ).use { rows ->
            check(rows.moveToFirst())
            return rows.getInt(0)
        }
    }

    @Test fun syntheticEnvelopeRoundTripsWithActualAndroidCryptoProvider() {
        // Under the @Before QEMU-only opt-in guard; no user notes or SAF access.
        create("Synthetic Android cryptography self-test", "Fictional content")
        val synthetic = "Fictional bytes only; no actual memo export"
            .toByteArray(Charsets.UTF_8)
        val passphrase = "synthetic Android-only passphrase for QA".toCharArray()
        val envelope = BackupEnvelope.encrypt(synthetic, passphrase)
        assertFalse(synthetic.contentEquals(envelope))
        assertArrayEquals(synthetic, BackupEnvelope.decrypt(envelope, passphrase))
        val changed = envelope.copyOf()
        changed[changed.lastIndex] = (changed.last().toInt() xor 1).toByte()
        assertThrows(java.security.GeneralSecurityException::class.java) {
            BackupEnvelope.decrypt(changed, passphrase)
        }
        // No encrypted data was written to any URI or used to restore notes.
    }

    @Test fun createsAndPersistsAcrossClosingAndReopeningDatabase() {
        val note = create("Offline", "Fictional text #privacy", "mint", pinned = true)
        assertEquals(1, note.version)
        assertEquals(note, store.get(note.id))
        store.close()
        store = MemoStore(context, databaseName)
        assertEquals(note, store.get(note.id))
        assertEquals(1, store.list().size)
        assertEquals(0, revisionCount(note.id))
    }

    @Test fun preservesPriorRevisionAndRejectsStaleEdit() {
        val original = create()
        val changed = store.save(
            original, "Revised", "Synthetic revised #testing", "sky",
            pinned = true, archived = false
        )
        assertEquals(original.id, changed.id)
        assertEquals(2, changed.version)
        assertEquals(1, revisionCount(original.id))
        store.readableDatabase.rawQuery(
            "SELECT title, content, version FROM revisions WHERE memo_id=?",
            arrayOf(original.id)
        ).use { rows ->
            assertTrue(rows.moveToFirst())
            assertEquals(original.title, rows.getString(0))
            assertEquals(original.content, rows.getString(1))
            assertEquals(1, rows.getInt(2))
        }
        assertThrows(IllegalStateException::class.java) {
            store.save(original, "Stale edit", "Never commit", "paper", false, false)
        }
        assertEquals(changed, store.get(changed.id))
        assertEquals(1, revisionCount(original.id))
    }

    @Test fun noOpEditDoesNotCreateFakeHistory() {
        val source = create()
        val result = store.save(source, source.title, source.content, source.color,
            source.pinned, source.archived)
        assertEquals(source, result)
        assertEquals(1, result.version)
        assertEquals(0, revisionCount(source.id))
        assertEquals(1, store.list().size)
    }

    @Test fun duplicateDoesNotAliasOriginalAndResetOrganizationFlags() {
        val source = create("Private #copy", "Fictional source", "rose",
            pinned = true, archived = true)
        val duplicate = store.duplicate(source)
        assertNotEquals(source.id, duplicate.id)
        assertEquals(source.title, duplicate.title)
        assertEquals(source.content, duplicate.content)
        assertEquals(source.color, duplicate.color)
        assertFalse(duplicate.pinned)
        assertFalse(duplicate.archived)
        assertFalse(duplicate.deleted)
        assertEquals(1, duplicate.version)
        assertEquals(2, store.list().size)
        assertEquals(source, store.get(source.id))
    }

    @Test fun reversibleTrashRestoreRetainsSameMemoAndHistory() {
        val note = create()
        val trashed = store.save(note, note.title, note.content, note.color,
            note.pinned, note.archived, deleted = true)
        assertTrue(trashed.deleted)
        assertEquals(2, trashed.version)
        assertThrows(IllegalArgumentException::class.java) {
            store.duplicate(trashed)
        }
        val restored = store.save(trashed, trashed.title, trashed.content, trashed.color,
            trashed.pinned, trashed.archived, deleted = false)
        assertFalse(restored.deleted)
        assertEquals(note.id, restored.id)
        assertEquals(3, restored.version)
        assertEquals(2, revisionCount(note.id))
        assertEquals(1, store.list().size)
    }

    @Test fun unknownLegacyVersionZeroSchemaIsNotOverwritten() {
        // Android SQLiteOpenHelper uses onCreate for user_version=0. Simulate
        // a pre-existing, unrecognized legacy table in this synthetic-only DB.
        store.close()
        val file = context.getDatabasePath(databaseName)
        check(file.parentFile?.mkdirs() == true || file.parentFile?.isDirectory == true)
        SQLiteDatabase.openOrCreateDatabase(file, null).use { raw ->
            raw.execSQL("CREATE TABLE legacy_private_memo (body TEXT NOT NULL)")
            raw.execSQL(
                "INSERT INTO legacy_private_memo(body) VALUES (?)",
                arrayOf("Synthetic legacy data: never delete")
            )
            assertEquals(0, raw.version)
        }
        store = MemoStore(context, databaseName)
        assertThrows(android.database.sqlite.SQLiteException::class.java) {
            store.list()
        }
        store.close()
        SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use { raw ->
            assertEquals(0, raw.version)
            raw.rawQuery("SELECT body FROM legacy_private_memo", null).use { rows ->
                assertTrue(rows.moveToFirst())
                assertEquals("Synthetic legacy data: never delete", rows.getString(0))
            }
            raw.rawQuery(
                "SELECT count(*) FROM sqlite_master WHERE type='table' " +
                "AND name IN ('memos','revisions')", null
            ).use { rows ->
                assertTrue(rows.moveToFirst())
                assertEquals("Do not create a new empty notebook over legacy data",
                    0, rows.getInt(0))
            }
        }
    }

    @Test fun newerDatabaseVersionIsNotDowngradedOrOverwritten() {
        val initial = create("Synthetic future-version", "Synthetic note to preserve")
        val edited = store.save(initial, "Synthetic future-version edited",
            "Synthetic revised content", "sky", pinned = true, archived = false)
        assertEquals(1, revisionCount(initial.id))
        store.close()
        val file = context.getDatabasePath(databaseName)
        SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use { raw ->
            raw.version = 2
        }
        store = MemoStore(context, databaseName)
        assertThrows(android.database.sqlite.SQLiteException::class.java) {
            store.list()
        }
        store.close()
        SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE).use { raw ->
            assertEquals(2, raw.version)
            raw.rawQuery(
                "SELECT title, content, version FROM memos WHERE id=?",
                arrayOf(initial.id)
            ).use { rows ->
                assertTrue(rows.moveToFirst())
                assertEquals(edited.title, rows.getString(0))
                assertEquals(edited.content, rows.getString(1))
                assertEquals(2, rows.getInt(2))
            }
            raw.rawQuery(
                "SELECT count(*) FROM revisions WHERE memo_id=?",
                arrayOf(initial.id)
            ).use { rows ->
                assertTrue(rows.moveToFirst())
                assertEquals(1, rows.getInt(0))
            }
            // Reset the version ONLY in this unique synthetic test database.
            raw.version = 1
        }
        store = MemoStore(context, databaseName)
        assertEquals(edited, store.get(initial.id))
        assertEquals(1, revisionCount(initial.id))
    }

    @Test fun failedSqliteWriteRollsBackRevisionAndLeavesOriginalIntact() {
        // Synthetic SQL trigger injects a transactional write error; this does
        // NOT claim to simulate physical disk exhaustion or storage corruption.
        val original = create("Before transient fault", "Synthetic unchanged #qa")
        val sql = store.writableDatabase
        sql.execSQL(
            "CREATE TRIGGER qa_reject_memo_update BEFORE UPDATE ON memos " +
            "BEGIN SELECT RAISE(ABORT, 'synthetic update rejection'); END"
        )
        try {
            assertThrows(android.database.sqlite.SQLiteException::class.java) {
                store.save(original, "After transient fault", "Never commit #qa",
                    "mint", pinned = true, archived = false)
            }
            assertEquals("Failed update must not alter the previous memo",
                original, store.get(original.id))
            assertEquals("Failed update must roll back inserted revision history",
                0, revisionCount(original.id))
            assertEquals(1, store.list().size)
        } finally {
            sql.execSQL("DROP TRIGGER qa_reject_memo_update")
        }
        // A new attempt after the injected fault is removed must succeed
        // without skipped versions or phantom history from the failed attempt.
        val recovered = store.save(original, "Recovered #qa", "Synthetic safe write",
            "mint", pinned = true, archived = false)
        assertEquals(2, recovered.version)
        assertEquals(1, revisionCount(original.id))
        assertEquals("Recovered #qa", store.get(original.id)?.title)
    }

    @Test fun sqliteCorruptionKeepsSyntheticDatabaseBytesForForensicRecovery() {
        // The main preview DB is never touched by this synthetic-only fault injection.
        val name = "memos_corrupt_" + java.util.UUID.randomUUID().toString()
            .replace("-", "") + ".sqlite3"
        val file = context.getDatabasePath(name)
        require(file.parentFile?.mkdirs() == true || file.parentFile?.isDirectory == true)
        val damaged = ByteArray(4096) { i -> (i % 211 + 17).toByte() }
        file.writeBytes(damaged)
        val victim = MemoStore(context, name)
        try {
            assertThrows(android.database.sqlite.SQLiteException::class.java) {
                victim.list()
            }
            assertTrue("Damaged SQLite file must NOT be automatically deleted", file.isFile)
            assertArrayEquals(
                "Detected corruption must not silently replace damaged bytes",
                damaged, file.readBytes()
            )
        } finally {
            victim.close()
            assertTrue("Delete only our unique corrupted test DB", context.deleteDatabase(name))
        }
        // The isolated test DB remains usable, and no default database was inspected.
        assertEquals(1, create(content = "Synthetic unaffected note").version)
    }

    @Test fun validationRejectsEmptyOversizedOrInvalidColorsWithoutWrites() {
        assertThrows(IllegalArgumentException::class.java) {
            create(title = "", content = "")
        }
        assertThrows(IllegalArgumentException::class.java) {
            create(title = "x".repeat(161))
        }
        assertThrows(IllegalArgumentException::class.java) {
            create(content = "x".repeat(65537))
        }
        assertThrows(IllegalArgumentException::class.java) {
            create(color = "unknown")
        }
        for (bad in listOf("../notes.sqlite3", "/tmp/notes.sqlite3",
                           "two/folders.sqlite3", "..sqlite3",
                           "memos.sqlite", "file:evil.sqlite3")) {
            assertThrows(IllegalArgumentException::class.java) {
                MemoStore(context, bad)
            }
        }
        assertTrue(store.list().isEmpty())
    }
}
