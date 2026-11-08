package com.goreecloud.memos

import org.junit.Assert.*
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException

class MemoSnapshotCodecTest {
    private val start = 1_761_000_000_000L
    private fun memo(
        id: String, title: String, content: String, version: Int = 1,
        archived: Boolean = false, deleted: Boolean = false, pinned: Boolean = false
    ) = Memo(id, title, content, "mint", pinned, archived, deleted,
        start, start + 1000, version)

    private val history = listOf(
        SnapshotRevision("memo-a", 1, "First", "Initial #work", start + 100),
        SnapshotRevision("memo-a", 2, "Second", "Edit #work", start + 200)
    )

    @Test fun completeUnicodeMemoAndRevisionHistoryRoundTrip() {
        val snapshot = MemoSnapshot(
            listOf(
                memo("memo-a", "日本語 🌱", "Fresh #ideas 😀", 3, archived = true, pinned = true),
                memo("memo-b", "Trashed synthetic memo", "More #privacy", deleted = true)
            ),
            history
        )
        val bytes = MemoSnapshotCodec.encode(snapshot)
        assertTrue(bytes.isNotEmpty())
        assertEquals(snapshot, MemoSnapshotCodec.decode(bytes))
        assertArrayEquals(bytes, MemoSnapshotCodec.encode(MemoSnapshotCodec.decode(bytes)))
        assertEquals(2, snapshot.memos.size)
        assertEquals(2, snapshot.revisions.size)
    }

    @Test fun anEmptyNotebookHasARealNontruncatedSnapshotHeader() {
        val snapshot = MemoSnapshot(emptyList(), emptyList())
        val bytes = MemoSnapshotCodec.encode(snapshot)
        assertEquals(20, bytes.size)
        assertEquals(snapshot, MemoSnapshotCodec.decode(bytes))
    }

    @Test fun rejectsMissingOrOrphanHistoryAndNoncanonicalRecords() {
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(listOf(memo("memo-a", "A", "B", 3)), history.take(1)))
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(listOf(memo("memo-a", "A", "B")), history))
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(listOf(memo("memo-b", "B", "B"), memo("memo-a", "A", "A")), emptyList()))
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(listOf(memo("memo-a", "A", "A"), memo("memo-a", "A", "A")), emptyList()))
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(listOf(memo("memo-a", "A", "A", 2)),
                listOf(SnapshotRevision("missing", 1, "A", "A", start))))
        }
    }

    @Test fun rejectsBogusHeaderVersionCountsAndTrailingBytes() {
        val bytes = MemoSnapshotCodec.encode(MemoSnapshot(emptyList(), emptyList()))
        val badMagic = bytes.copyOf().also { it[0] = 0 }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.decode(badMagic)
        }
        val badVersion = bytes.copyOf()
        ByteBuffer.wrap(badVersion, 8, 4).putInt(999)
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.decode(badVersion)
        }
        val hugeCount = bytes.copyOf()
        ByteBuffer.wrap(hugeCount, 12, 4).putInt(1_000_000)
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.decode(hugeCount)
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.decode(bytes + byteArrayOf(0))
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.decode(ByteArray(8 * 1024 * 1024 + 1))
        }
    }

    @Test fun rejectsInvalidUtf8OrTruncatedFieldsBeforeImport() {
        val snapshot = MemoSnapshot(listOf(memo("memo-a", "Valid", "Synthetic")), emptyList())
        val bytes = MemoSnapshotCodec.encode(snapshot)
        val bad = bytes.copyOf()
        // First serialized text (memo ID) begins at byte 24.
        bad[24] = 0xC3.toByte()
        bad[25] = 0x28
        assertThrows(CharacterCodingException::class.java) {
            MemoSnapshotCodec.decode(bad)
        }
        assertThrows(Exception::class.java) {
            MemoSnapshotCodec.decode(bytes.copyOf(bytes.size - 2))
        }
        assertThrows(CharacterCodingException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(
                listOf(memo("memo-a", "Invalid \uD800 surrogate", "Text")), emptyList()))
        }
    }

    @Test fun rejectsTooManyRecordsAndOverbudgetRecordsInsteadOfTruncating() {
        val one = memo("memo-a", "A", "A")
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(List(4097) { one }, emptyList()))
        }
        val many = (0 until 132).map {
            memo("memo-" + it.toString().padStart(4, '0'), "A", "x".repeat(65536))
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoSnapshotCodec.encode(MemoSnapshot(many, emptyList()))
        }
    }

    @Test fun syntheticFullHistoryCanPassTheIsolatedCryptoEnvelope() {
        val snapshot = MemoSnapshot(
            listOf(memo("memo-a", "Archived", "Initial notes #tag", 3, archived = true)),
            history
        )
        val raw = MemoSnapshotCodec.encode(snapshot)
        val passphrase = "fictional extremely private test password".toCharArray()
        try {
            val sealed = BackupEnvelope.encrypt(raw, passphrase)
            assertFalse(sealed.contentEquals(raw))
            val recoveredRaw = BackupEnvelope.decrypt(sealed, passphrase)
            try {
                assertEquals(snapshot, MemoSnapshotCodec.decode(recoveredRaw))
            } finally {
                recoveredRaw.fill(0)
            }
        } finally {
            raw.fill(0)
            passphrase.fill('\u0000')
        }
    }
}
