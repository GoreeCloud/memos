import { Settings2Icon } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslate } from "@/utils/i18n";
import "./Setting.css";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DEFAULT_SETTING_SECTION,
  isSettingSectionKey,
  SETTINGS_SECTIONS,
  type SettingSectionKey,
} from "@/components/Settings/settingSections";
import { useInstance } from "@/contexts/InstanceContext";
import useCurrentUser from "@/hooks/useCurrentUser";
import { ROUTES } from "@/router/routes";
import { User_Role } from "@/types/proto/api/v1/user_service_pb";

const Setting = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslate();
  const user = useCurrentUser();
  const { fetchSettings } = useInstance();
  const [selectedSection, setSelectedSection] = useState<SettingSectionKey>(DEFAULT_SETTING_SECTION);
  const isHost = user?.role === User_Role.ADMIN;

  // A retained scroll offset from a previous memo list must not hide the Settings title.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const sectionGroups = useMemo(() => {
    const visibleSections = SETTINGS_SECTIONS.filter((section) => section.scope === "basic" || isHost);
    return {
      admin: visibleSections.filter((section) => section.scope === "admin"),
      all: visibleSections,
    };
  }, [isHost]);

  const visibleSectionKeys = useMemo(() => new Set(sectionGroups.all.map((section) => section.key)), [sectionGroups.all]);

  useEffect(() => {
    const hash = location.hash.slice(1);
    const nextSection = isSettingSectionKey(hash) && visibleSectionKeys.has(hash) ? hash : DEFAULT_SETTING_SECTION;
    setSelectedSection(nextSection);
  }, [location.hash, visibleSectionKeys]);

  // Jump back to the top when switching sections; skip the initial hash sync so
  // scroll restoration on back-navigation still wins.
  const prevSectionRef = useRef<SettingSectionKey | null>(null);
  useEffect(() => {
    if (prevSectionRef.current && prevSectionRef.current !== selectedSection) {
      window.scrollTo({ top: 0 });
    }
    prevSectionRef.current = selectedSection;
  }, [selectedSection]);

  useEffect(() => {
    if (!isHost) {
      return;
    }
    const preloadSettingKeys = new Set(sectionGroups.admin.flatMap((section) => section.preloadSettingKeys ?? []));
    void fetchSettings([...preloadSettingKeys]);
  }, [fetchSettings, isHost, sectionGroups.admin]);

  const selectedSectionDefinition =
    sectionGroups.all.find((section) => section.key === selectedSection) ??
    SETTINGS_SECTIONS.find((section) => section.key === DEFAULT_SETTING_SECTION) ??
    SETTINGS_SECTIONS[0];
  const ActiveSection = selectedSectionDefinition.component;

  return (
    <section className="gc-settings-page w-full min-h-full">
      <div className="gc-settings-shell">
        <header className="gc-settings-hero">
          <span className="gc-settings-hero-icon" aria-hidden="true">
            <Settings2Icon />
          </span>
          <div className="gc-settings-hero-copy">
            <p className="gc-settings-eyebrow">GoreeCloud</p>
            <h1>{t("common.settings")}</h1>
          </div>
          <select
            aria-label="Settings section"
            className="gc-settings-section-select"
            value={selectedSection}
            onChange={(event) => navigate(`${ROUTES.SETTING}#${event.target.value}`)}
          >
            {sectionGroups.all.map((section) => (
              <option key={section.key} value={section.key}>
                {t(section.labelKey)}
              </option>
            ))}
          </select>
        </header>
        <div className="gc-settings-content min-w-0">
          <ActiveSection />
        </div>
      </div>
    </section>
  );
};

export default Setting;
