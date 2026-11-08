package com.goreecloud.memos

import android.content.Context
import android.os.Build
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.util.Locale
import java.util.UUID
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Synthetic SQLite tests on a disposable emulator, never on real user notes. */
@RunWith(AndroidJUnit4::class)
class MemoStoreInstrumentedTest {
    private lateinit var context: Context
    private lateinit var store: MemoStore
    private lateinit var databaseName: String

    @Before fun setUp() {
        val hardware = Build.HARDWARE.lowercase(Locale.ROOT)
        check(hardware.contains("ranchu") || hardware.contains("goldfish")) {
            "Refusing SQLite testing on non-emulator hardware"
        }
        check(InstrumentationRegistry.getArguments()
            .getString("goreecloudDisposable") == "1") {
            "Refusing storage QA without explicit disposable-emulator opt-in"
        }
        context = InstrumentationRegistry.getInstrumentation().targetContext
        check(context.packageName == "com.goreecloud.memos")
        databaseName = "memos_qa_" + UUID.randomUUID().toString().replace("-", "") + ".sqlite3"
        store = MemoStore(context, databaseName)
    }

    @After fun tearDown() {
        if (::store.isInitialized) {
            store.close()
            check(context.deleteDatabase(databaseName)) { "Disposable database not removed" }
        }
    }

    private fun create(title: String = "Fictional memo",
                       content: String = "Only synthetic data #qa"): Memo =
        store.save(null, title, content, "sun", pinned = false, archived = false)

    @Test fun persistsAcrossCloseAndReopen() {
        val first = create()
        assertEquals(1, store.list().size)
        store.close()
        store = MemoStore(context, databaseName)
        assertEquals(first.id, store.get(first.id)?.id)
        assertEquals(first.content, store.get(first.id)?.content)
        assertEquals(1, store.get(first.id)?.version)
    }

    @Test fun revisionAndStaleUpdateAreAtomic() {
        val before = create()
        val after = store.save(before, "Updated fictional title", "New #qa body",
            "mint", pinned = true, archived = false)
        assertEquals(2, after.version)
        assertThrows(IllegalStateException::class.java) {
            store.save(before, "Stale title", "Stale body", "rose",
                pinned = false, archived = false)
        }
        store.readableDatabase.rawQuery(
            "SELECT version, title, content FROM revisions WHERE memo_id=?",
            arrayOf(before.id)
        ).use { rows ->
            assertTrue(rows.moveToFirst())
            assertEquals(1, rows.getInt(0))
            assertEquals(before.title, rows.getString(1))
            assertEquals(before.content, rows.getString(2))
            assertFalse(rows.moveToNext())
        }
        assertEquals(after, store.get(before.id))
    }

    @Test fun pinArchiveTrashRestoreAreVersionedAndReversible() {
        val one = create()
        val two = store.save(one, one.title, one.content, one.color, true, false)
        val three = store.save(two, two.title, two.content, two.color, true, true)
        val four = store.save(three, three.title, three.content, three.color,
            true, true, deleted = true)
        val five = store.save(four, four.title, four.content, four.color,
            true, false, deleted = false)
        assertEquals(5, five.version)
        assertTrue(five.pinned)
        assertFalse(five.archived)
        assertFalse(five.deleted)
        store.readableDatabase.rawQuery(
            "SELECT count(*) FROM revisions WHERE memo_id=?", arrayOf(one.id)
        ).use { rows ->
            assertTrue(rows.moveToFirst())
            assertEquals(4, rows.getInt(0))
        }
        assertEquals(1, store.list().size)
    }

    @Test fun duplicatesAreIndependentActiveNotes() {
        val original = create("Synthetic checklist", "- [ ] Example #qa")
        val pinned = store.save(original, original.title, original.content,
            original.color, pinned = true, archived = true)
        val copy = store.duplicate(pinned)
        assertNotEquals(pinned.id, copy.id)
        assertEquals(pinned.content, copy.content)
        assertEquals(pinned.title, copy.title)
        assertFalse(copy.pinned)
        assertFalse(copy.archived)
        assertFalse(copy.deleted)
        assertEquals(1, copy.version)
        assertEquals(2, store.list().size)
        val trashed = store.save(pinned, pinned.title, pinned.content, pinned.color,
            pinned = true, archived = true, deleted = true)
        assertThrows(IllegalArgumentException::class.java) { store.duplicate(trashed) }
    }

    @Test fun invalidDataAndUnsafeDatabaseNamesAreRejected() {
        assertThrows(IllegalArgumentException::class.java) {
            store.save(null, "", "", "paper", false, false)
        }
        assertThrows(IllegalArgumentException::class.java) {
            store.save(null, "title", "body", "invalid", false, false)
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoStore(context, "../outside.sqlite3")
        }
        assertEquals(0, store.list().size)
    }
}
