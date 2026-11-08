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
