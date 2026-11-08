package com.goreecloud.memos

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

class MemoLogicTest {
    private val chicago = ZoneId.of("America/Chicago")

    private fun sample(content: String = "hello #work", title: String = "Memo") =
        Memo("fake-id", title, content, "paper", false, false, false, 0L, 0L, 1)

    @Test fun hashtagsAreUnicodeAwareDistinctAndBounded() {
        assertEquals(listOf("work", "中文"), MemoLogic.tags("Read #work and #work #中文"))
        assertEquals(emptyList<String>(), MemoLogic.tags("foo#embedded no-tags"))
        assertEquals(listOf("work/projects"), MemoLogic.tags("#work/projects"))
    }

    @Test fun bodyAndTitleLimitsAreValidated() {
        MemoLogic.validate("", "A small memo", "sky")
        assertThrows(IllegalArgumentException::class.java) { MemoLogic.validate("", "", "paper") }
        assertThrows(IllegalArgumentException::class.java) {
            MemoLogic.validate("x".repeat(161), "body", "paper")
        }
        assertThrows(IllegalArgumentException::class.java) {
            MemoLogic.validate("", "x".repeat(65537), "paper")
        }
        assertThrows(IllegalArgumentException::class.java) { MemoLogic.validate("title", "body", "unknown") }
    }

    @Test fun dayGroupingUsesCalendarDatesAcrossDstTransition() {
        val now = ZonedDateTime.of(2026, 3, 9, 0, 30, 0, 0, chicago).toInstant().toEpochMilli()
        val yesterday = ZonedDateTime.of(2026, 3, 8, 0, 15, 0, 0, chicago).toInstant().toEpochMilli()
        assertEquals("Yesterday", MemoLogic.dayHeading(yesterday, now, chicago))
        assertEquals(LocalDate.of(2026, 3, 8), MemoLogic.localDate(yesterday, chicago))
    }

    @Test fun filtersUseContentAndCaseInsensitiveTags() {
        assertTrue(MemoLogic.matches(sample(), "MEMO", "work"))
        assertTrue(MemoLogic.matches(sample(), "hello", "WORK"))
        assertFalse(MemoLogic.matches(sample(), "absent", "work"))
        assertFalse(MemoLogic.matches(sample(), "hello", "travel"))
    }
}
