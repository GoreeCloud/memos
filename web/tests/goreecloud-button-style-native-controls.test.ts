import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mapViewSource = readFileSync(resolve(process.cwd(), "src/components/MapView/MapView.tsx"), "utf8");
const memoPanelSource = readFileSync(resolve(process.cwd(), "src/components/MemoPanel/MemoPanel.tsx"), "utf8");
const memoViewsSource = readFileSync(resolve(process.cwd(), "src/pages/MemoViews.tsx"), "utf8");
const calendarHeaderSource = readFileSync(resolve(process.cwd(), "src/components/CalendarView/CalendarHeader.tsx"), "utf8");
const monthPickerSource = readFileSync(resolve(process.cwd(), "src/components/CalendarView/MonthPicker.tsx"), "utf8");
const statisticsMonthNavigatorSource = readFileSync(resolve(process.cwd(), "src/components/StatisticsView/MonthNavigator.tsx"), "utf8");
const inboxNotificationSources = [
  readFileSync(resolve(process.cwd(), "src/components/Inbox/MemoCommentMessage.tsx"), "utf8"),
  readFileSync(resolve(process.cwd(), "src/components/Inbox/MemoMentionMessage.tsx"), "utf8"),
  readFileSync(resolve(process.cwd(), "src/components/Inbox/SpaceInvitationMessage.tsx"), "utf8"),
];

describe("GoreeCloud Button Style native-control coverage", () => {
  it("covers labeled map zoom and fit icon controls", () => {
    for (const key of ["map.zoom-in", "map.zoom-out", "map.fit-all"]) {
      const label = 'data-goreecloud-label={t("' + key + '")}';
      expect(mapViewSource).toContain(label);
    }
    expect(mapViewSource.match(/data-goreecloud-icon-button=""/g)).toHaveLength(3);
  });

  it("covers the labeled memo-panel close icon control", () => {
    expect(memoPanelSource).toContain('aria-label={t("common.close")}');
    expect(memoPanelSource).toContain('data-goreecloud-icon-button=""');
    expect(memoPanelSource).toContain('data-goreecloud-label={t("common.close")}');
  });

  it("covers labeled calendar month and year navigation controls", () => {
    for (const key of ["common.previous-month", "common.next-month"]) {
      expect(calendarHeaderSource).toContain('aria-label={t("' + key + '")}');
      expect(calendarHeaderSource).toContain('data-goreecloud-label={t("' + key + '")}');
    }
    expect(calendarHeaderSource.match(/data-goreecloud-icon-button=""/g)).toHaveLength(2);

    for (const key of ["calendar.previous-year", "calendar.next-year"]) {
      expect(monthPickerSource).toContain('aria-label={t("' + key + '")}');
      expect(monthPickerSource).toContain('data-goreecloud-label={t("' + key + '")}');
    }
    expect(monthPickerSource.match(/data-goreecloud-icon-button=""/g)).toHaveLength(2);
  });

  it("covers labeled statistics month navigation controls", () => {
    for (const key of ["common.previous-month", "common.next-month"]) {
      expect(statisticsMonthNavigatorSource).toContain('aria-label={t("' + key + '")}');
      expect(statisticsMonthNavigatorSource).toContain('data-goreecloud-label={t("' + key + '")}');
    }
    expect(statisticsMonthNavigatorSource.match(/data-goreecloud-icon-button=""/g)).toHaveLength(2);
  });

  it("covers Inbox archive/delete icon actions with accessible keyboard-visible controls", () => {
    for (const source of inboxNotificationSources) {
      expect(source.match(/data-goreecloud-icon-button=""/g)).toHaveLength(3);
      expect(source).toContain('const archiveActionLabel = t("common.archive");');
      expect(source).toContain('const deleteActionLabel = t("common.delete");');
      expect(source).toContain("aria-label={archiveActionLabel}");
      expect(source).toContain("data-goreecloud-label={archiveActionLabel}");
      expect(source.match(/aria-label={deleteActionLabel}/g)).toHaveLength(2);
      expect(source.match(/data-goreecloud-label={deleteActionLabel}/g)).toHaveLength(2);
      expect(source.match(/focus-visible:opacity-100/g)).toHaveLength(3);
    }
  });

  it("keeps saved-view action controls named and text-mode safe", () => {
    expect(memoViewsSource).toContain('aria-label={`${t("common.edit")} ${memoView.title}`}');
    expect(memoViewsSource).toContain("sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)_max-content]");
  });
});
