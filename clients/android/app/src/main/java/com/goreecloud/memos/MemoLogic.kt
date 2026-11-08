package com.goreecloud.memos

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Pure note logic used by the native Android preview, independently JVM-tested. */
data class Memo(
    val id: String,
    val title: String,
    val content: String,
    val color: String,
    val pinned: Boolean,
    val archived: Boolean,
    val deleted: Boolean,
    val createdAt: Long,
    val updatedAt: Long,
    val version: Int
)

object MemoLogic {
    val colors = listOf("paper", "sun", "mint", "sky", "rose", "lavender")
    const val MAX_TITLE = 160
    const val MAX_CONTENT = 65536
    private val hashtag = Regex("(?<![\\p{L}\\p{N}_])#([\\p{L}\\p{N}_/-]{1,64})")

    fun validate(title: String, content: String, color: String) {
        require(title.length <= MAX_TITLE) { "Title is too long" }
        require(content.length <= MAX_CONTENT) { "Memo is too long" }
        require(color in colors) { "Invalid note color" }
        require(title.isNotBlank() || content.isNotBlank()) { "Write something before saving" }
    }

    fun tags(content: String): List<String> =
        hashtag.findAll(content).map { it.groupValues[1] }
            .distinctBy { it.lowercase(Locale.ROOT) }.sortedBy { it.lowercase(Locale.ROOT) }.toList()

    fun localDate(epochMillis: Long, zone: ZoneId = ZoneId.systemDefault()): LocalDate =
        Instant.ofEpochMilli(epochMillis).atZone(zone).toLocalDate()

    fun dayHeading(epochMillis: Long, todayMillis: Long = System.currentTimeMillis(),
                   zone: ZoneId = ZoneId.systemDefault()): String {
        val day = localDate(epochMillis, zone)
        val today = localDate(todayMillis, zone)
        return when (day) {
            today -> "Today"
            today.minusDays(1) -> "Yesterday"
            else -> day.format(DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.getDefault()))
        }
    }

    fun matches(memo: Memo, query: String, selectedTag: String): Boolean {
        val searched = query.trim()
        if (searched.isNotEmpty() &&
            !memo.title.contains(searched, ignoreCase = true) &&
            !memo.content.contains(searched, ignoreCase = true)) return false
        if (selectedTag.isNotEmpty() &&
            tags(memo.content).none { it.equals(selectedTag, ignoreCase = true) }) return false
        return true
    }
}
