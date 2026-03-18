# Changelog

All notable changes to the "Battalion TimePlanner" project will be documented in this file.

## [0.1.1] - 2026-03-18
### Added
- **Timeline Day Separators**: A minimalist grey divider with explicitly capitalized date text now automatically segments the timeline vertically on multi-day drill schedules.
- **Visually Split Timeline Phases**: "Arbeitsphasen" that span across a "Blocktermin" or working hour boundary are now visually spliced into distinct chunks in the UI. For instance, a 4-hour phase interrupted by a 1-hour lunch is drawn natively as a 1h phase, the lunch break, and a 3h phase. (Note: Rapports and Rehearsals remain undivided visually).
- **Blocker / Rapport Conflict Warnings**: The app now actively scans the generated schedule for logical overlaps. If a monolithic `Rapport` falls exactly into the time parameters of a `Blocktermin`, it will be stamped with a red "⚠️ Konflikt" badge in the timeline and trigger a global orange warning banner at the top.
- **Advanced Blocker Configuration**: Blockers can now be set to apply "Täglich" (Daily) or to a specific Date ("Einmalig").
- **Fixed Blocker Visualization**: Daily blockers are now correctly rendered on every active day in the visual timeline, accurately matching the math.
- **Timeline Item Completion**: Checkboxes to mark tasks as done. Completed tasks are hidden by default and can be toggled visible.
- **Past Event Warnings**: Timeline now shows warnings (⚠️ and orange banner) for scheduled events that are already in the past based on the current system time.
- **Variable Report Duration**: Users can now set the duration for each individual report in the "Rapporte und Arbeitsphasen" section.
- **Deployment Guide**: Added `DEPLOYMENT.md` with instructions for GitHub Pages.
- **GitHub Pages Support**: Added `deploy` script and configured `vite.config.js`.

### Fixed
- **Time Calculation Logic**: Rehearsal times now correctly calculate backwards, jumping over non-working hours and block times.

## [0.1] - 2026-02-03
### Added
- **Initial Release**: Basic Battalion TimePlanner functionality.
- **UI**: Cards for "Zeitliche Gesamtübersicht", "Grundparameter", "Blocktermine", "Rapporte".
- **Logic**: Forward calculation of phases and reports respecting blockers.
- **Tech Stack**: React, Tailwind CSS, Shadcn UI components.
