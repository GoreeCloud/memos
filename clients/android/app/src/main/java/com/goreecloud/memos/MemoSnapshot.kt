package com.goreecloud.memos

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

/**
 * INTERNAL, PROVISIONAL, IN-MEMORY source snapshot format (not user export).
 *
 * This type does not write or read files, mutate a database, or restore notes.
 * It must not be exposed to the UI until encrypted export and safe staging
 * restore are implemented, independently reviewed and verified.
 */
internal data class SnapshotRevision(
    val memoId: String,
    val version: Int,
    val title: String,
    val content: String,
    val savedAt: Long
)

internal data class MemoSnapshot(
    val memos: List<Memo>,
    val revisions: List<SnapshotRevision>
)

/** Canonical bounded v1 binary format for review, not a stable published ABI. */
internal object MemoSnapshotCodec {
    private val MAGIC = "GCSNP001".toByteArray(StandardCharsets.US_ASCII)
    private const val SCHEMA = 1
    internal const val MAX_BINARY_BYTES = 8 * 1024 * 1024
    internal const val MAX_MEMOS = 4096
    internal const val MAX_REVISIONS = 16384
    private const val MAX_ID_BYTES = 128
    private const val MAX_TITLE_BYTES = 640
    private const val MAX_CONTENT_BYTES = 262144
    private const val MAX_COLOR_BYTES = 32
    private const val FIXED_BYTES = 20L
    private val idPattern = Regex("[a-zA-Z0-9_-]{1,128}")

    /** Reject malformed UTF-16 instead of silently replacing user characters. */
    private fun utf8(text: String, maxLength: Int): ByteArray {
        val buffer = StandardCharsets.UTF_8.newEncoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .encode(CharBuffer.wrap(text))
        require(buffer.remaining() <= maxLength) { "Snapshot text field too large" }
        return ByteArray(buffer.remaining()).also(buffer::get)
    }

    internal fun estimatedMemoBytes(memo: Memo): Long =
        39L + utf8(memo.id, MAX_ID_BYTES).size +
            utf8(memo.title, MAX_TITLE_BYTES).size +
            utf8(memo.content, MAX_CONTENT_BYTES).size +
            utf8(memo.color, MAX_COLOR_BYTES).size

    internal fun estimatedRevisionBytes(rev: SnapshotRevision): Long =
        24L + utf8(rev.memoId, MAX_ID_BYTES).size +
            utf8(rev.title, MAX_TITLE_BYTES).size +
            utf8(rev.content, MAX_CONTENT_BYTES).size

    /** Reject incomplete history, duplicate IDs and unsupported fields. */
    internal fun validate(snapshot: MemoSnapshot) {
        require(snapshot.memos.size <= MAX_MEMOS) { "Snapshot exceeds memo count limit" }
        require(snapshot.revisions.size <= MAX_REVISIONS) {
            "Snapshot exceeds revision count limit"
        }
        val byId = LinkedHashMap<String, Memo>()
        var previousId: String? = null
        var total = FIXED_BYTES
        snapshot.memos.forEach { memo ->
            require(idPattern.matches(memo.id)) { "Snapshot memo ID is invalid" }
            require(previousId == null || previousId < memo.id) {
                "Snapshot memo IDs must be unique and sorted"
            }
            previousId = memo.id
            require(memo.version in 1..(MAX_REVISIONS + 1)) {
                "Snapshot memo version is unsupported"
            }
            require(memo.createdAt > 0 && memo.updatedAt > 0) {
                "Snapshot memo timestamps are invalid"
            }
            MemoLogic.validate(memo.title, memo.content, memo.color)
            byId[memo.id] = memo
            total += estimatedMemoBytes(memo)
            require(total <= MAX_BINARY_BYTES) { "Snapshot exceeds in-memory limit" }
        }
        val revisionProgress = HashMap<String, Int>()
        var previousRevisionId = ""
        var previousVersion = 0
        snapshot.revisions.forEach { rev ->
            val memo = byId[rev.memoId] ?: throw IllegalArgumentException(
                "Snapshot revision references a missing memo"
            )
            require(rev.memoId > previousRevisionId ||
                (rev.memoId == previousRevisionId && rev.version > previousVersion)) {
                "Snapshot revisions must be strictly sorted and unique"
            }
            previousRevisionId = rev.memoId
            previousVersion = rev.version
            val expected = (revisionProgress[rev.memoId] ?: 0) + 1
            require(rev.version == expected && rev.version < memo.version) {
                "Snapshot contains missing or inconsistent revision versions"
            }
            require(rev.savedAt > 0) { "Snapshot revision timestamp is invalid" }
            MemoLogic.validate(rev.title, rev.content, memo.color)
            revisionProgress[rev.memoId] = rev.version
            total += estimatedRevisionBytes(rev)
            require(total <= MAX_BINARY_BYTES) { "Snapshot exceeds in-memory limit" }
        }
        snapshot.memos.forEach { memo ->
            require((revisionProgress[memo.id] ?: 0) == memo.version - 1) {
                "Snapshot must contain the complete revision history"
            }
        }
    }

    private fun DataOutputStream.writeText(text: String, limit: Int) {
        val bytes = utf8(text, limit)
        writeInt(bytes.size)
        write(bytes)
    }

    private fun DataInputStream.readText(limit: Int): String {
        val length = readInt()
        require(length in 0..limit && length <= available()) {
            "Snapshot contains a malformed text length"
        }
        val bytes = ByteArray(length)
        readFully(bytes)
        return StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(bytes)).toString()
    }

    /** Never truncate: reject snapshots that cannot fit the experimental cap. */
    fun encode(snapshot: MemoSnapshot): ByteArray {
        validate(snapshot)
        val bytes = ByteArrayOutputStream()
        DataOutputStream(bytes).use { out ->
            out.write(MAGIC)
            out.writeInt(SCHEMA)
            out.writeInt(snapshot.memos.size)
            out.writeInt(snapshot.revisions.size)
            snapshot.memos.forEach { memo ->
                out.writeText(memo.id, MAX_ID_BYTES)
                out.writeText(memo.title, MAX_TITLE_BYTES)
                out.writeText(memo.content, MAX_CONTENT_BYTES)
                out.writeText(memo.color, MAX_COLOR_BYTES)
                out.writeByte(if (memo.pinned) 1 else 0)
                out.writeByte(if (memo.archived) 1 else 0)
                out.writeByte(if (memo.deleted) 1 else 0)
                out.writeLong(memo.createdAt)
                out.writeLong(memo.updatedAt)
                out.writeInt(memo.version)
            }
            snapshot.revisions.forEach { rev ->
                out.writeText(rev.memoId, MAX_ID_BYTES)
                out.writeInt(rev.version)
                out.writeText(rev.title, MAX_TITLE_BYTES)
                out.writeText(rev.content, MAX_CONTENT_BYTES)
                out.writeLong(rev.savedAt)
            }
        }
        return bytes.toByteArray().also {
            require(it.size <= MAX_BINARY_BYTES) { "Snapshot is too large" }
        }
    }

    private fun DataInputStream.readFlag(): Boolean {
        val value = readUnsignedByte()
        require(value == 0 || value == 1) { "Snapshot contains an invalid flag" }
        return value == 1
    }

    /** Parse only bounded, canonical data; this never writes into SQLite. */
    fun decode(inputBytes: ByteArray): MemoSnapshot {
        require(inputBytes.size in FIXED_BYTES.toInt()..MAX_BINARY_BYTES) {
            "Snapshot binary payload length is unsupported"
        }
        DataInputStream(ByteArrayInputStream(inputBytes)).use { input ->
            val magic = ByteArray(MAGIC.size)
            input.readFully(magic)
            require(magic.contentEquals(MAGIC)) { "Unsupported snapshot format" }
            require(input.readInt() == SCHEMA) { "Unsupported snapshot schema" }
            val memoCount = input.readInt()
            val revisionCount = input.readInt()
            require(memoCount in 0..MAX_MEMOS && revisionCount in 0..MAX_REVISIONS) {
                "Snapshot entry count is unsupported"
            }
            val memos = ArrayList<Memo>(memoCount)
            repeat(memoCount) {
                memos += Memo(
                    id = input.readText(MAX_ID_BYTES),
                    title = input.readText(MAX_TITLE_BYTES),
                    content = input.readText(MAX_CONTENT_BYTES),
                    color = input.readText(MAX_COLOR_BYTES),
                    pinned = input.readFlag(),
                    archived = input.readFlag(),
                    deleted = input.readFlag(),
                    createdAt = input.readLong(),
                    updatedAt = input.readLong(),
                    version = input.readInt()
                )
            }
            val revisions = ArrayList<SnapshotRevision>(revisionCount)
            repeat(revisionCount) {
                revisions += SnapshotRevision(
                    memoId = input.readText(MAX_ID_BYTES),
                    version = input.readInt(),
                    title = input.readText(MAX_TITLE_BYTES),
                    content = input.readText(MAX_CONTENT_BYTES),
                    savedAt = input.readLong()
                )
            }
            require(input.available() == 0) { "Snapshot contains trailing data" }
            return MemoSnapshot(memos, revisions).also(::validate)
        }
    }
}
