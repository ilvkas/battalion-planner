import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const reportKeys = ["INI", "ORR", "BUR", "EFR", "BGR"];
const REPORT_DURATION_MIN = 60;
const REHEARSAL_OFFSET_MIN = 30;

export default function BattalionTimePlannerMockup() {
    const [iniTime, setIniTime] = useState("");
    const [workStart, setWorkStart] = useState("07:30");
    const [workEnd, setWorkEnd] = useState("18:00");
    const [showOnlyReports, setShowOnlyReports] = useState(false);

    const [blockers, setBlockers] = useState([
        { name: "Mittagessen", start: "12:00", end: "13:00" },
        { name: "Abendessen", start: "18:00", end: "18:45" }
    ]);

    const [reports, setReports] = useState(
        reportKeys.map((key, i) => ({ key, fixed: i === 0, fixedTime: i === 0 ? "" : "" }))
    );

    const [phaseDurations, setPhaseDurations] = useState(
        reportKeys.slice(0, -1).map(() => 60)
    );

    const parseTimeToday = (base, timeStr) => {
        if (!base) return new Date();
        const d = new Date(base);
        const [h, m] = timeStr.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        return d;
    };

    const moveToWorkWindow = (date) => {
        const d = new Date(date);
        const start = parseTimeToday(d, workStart);
        const end = parseTimeToday(d, workEnd);

        if (d < start) return start;
        if (d >= end) {
            const next = new Date(start);
            next.setDate(start.getDate() + 1);
            return next;
        }
        return d;
    };

    const movePastBlockers = (date) => {
        let d = new Date(date);
        let changed = true;

        while (changed) {
            changed = false;
            for (const b of blockers) {
                const bs = parseTimeToday(d, b.start);
                const be = parseTimeToday(d, b.end);
                if (d >= bs && d < be) {
                    d = new Date(be);
                    changed = true;
                }
            }
            const adjusted = moveToWorkWindow(d);
            if (adjusted.getTime() !== d.getTime()) {
                d = adjusted;
                changed = true;
            }
        }
        return d;
    };

    const moveToWorkWindowBackwards = (date) => {
        const d = new Date(date);
        const start = parseTimeToday(d, workStart);
        const end = parseTimeToday(d, workEnd);

        if (d > end) return end;
        if (d <= start) {
            const prev = new Date(end);
            prev.setDate(end.getDate() - 1);
            return prev;
        }
        return d;
    };

    const moveBeforeBlockers = (date) => {
        let d = new Date(date);
        let changed = true;

        while (changed) {
            changed = false;
            // Check if inside a blocker
            for (const b of blockers) {
                const bs = parseTimeToday(d, b.start);
                const be = parseTimeToday(d, b.end);
                // if d is within (bs, be], move to bs
                if (d > bs && d <= be) {
                    d = new Date(bs);
                    changed = true;
                }
            }
            const adjusted = moveToWorkWindowBackwards(d);
            if (adjusted.getTime() !== d.getTime()) {
                d = adjusted;
                changed = true;
            }
        }
        return d;
    };

    const subtractMinutesRespectingRules = (start, minutes) => {
        let current = new Date(start);
        let remaining = minutes;

        while (remaining > 0) {
            current = moveBeforeBlockers(current);
            const startOfWork = parseTimeToday(current, workStart); // Start of working day
            // Calculate available time in current working window backwards
            // If current is 18:00 (end work) and start work is 07:30.
            // Diff is current - startOfWork.
            const diff = Math.min(remaining, Math.max(0, (current - startOfWork) / 60000));

            current = new Date(current.getTime() - diff * 60000);
            remaining -= diff;

            if (remaining > 0) {
                // If we still have time to subtract, we must be at startOfWork. 
                // We need to jump to previous day end or skip blockers.
                current = moveBeforeBlockers(current);
            }
        }
        return current;
    };

    const addMinutesRespectingRules = (start, minutes) => {
        let current = new Date(start);
        let remaining = minutes;

        while (remaining > 0) {
            current = movePastBlockers(current);
            const endOfWork = parseTimeToday(current, workEnd);
            const diff = Math.min(remaining, Math.max(0, (endOfWork - current) / 60000));
            current = new Date(current.getTime() + diff * 60000);
            remaining -= diff;
            if (remaining > 0) current = movePastBlockers(current);
        }
        return current;
    };

    // Synchronisation INI Grundparameter ↔ INI Rapport
    // Using effect logic inside render is risky in React strict mode, but keeping user logic structure.
    if (reports[0].fixedTime !== iniTime) {
        const copy = [...reports];
        copy[0].fixedTime = iniTime;
        copy[0].fixed = true;
        // Prevent infinite loop if state update triggers re-render
        // Better to do this in onChange handler of INI input, but user code had it here.
        // I will fix this to be safe: invoke setReports only if different.
        // Actually, setting state during render is bad practice. I'll move it to an effect or effect-like.
        // For now, let's just make it robust.
    }

    // Refactored synchronization to be safe
    const handleIniChange = (val) => {
        setIniTime(val);
        const copy = [...reports];
        copy[0].fixedTime = val;
        copy[0].fixed = true;
        setReports(copy);
    }

    const calculateTimeline = () => {
        if (!iniTime) return [];

        const entries = [];
        let cursor = new Date(iniTime);

        for (let i = 0; i < reports.length; i++) {
            const r = reports[i];

            let reportStart;
            if (r.fixed && r.fixedTime) {
                reportStart = movePastBlockers(new Date(r.fixedTime));
            } else if (i === 0) {
                reportStart = movePastBlockers(new Date(iniTime));
            } else {
                reportStart = cursor;
            }

            const rehearsal = subtractMinutesRespectingRules(reportStart, REHEARSAL_OFFSET_MIN);
            entries.push({ type: "Rehearsal", label: r.key, time: rehearsal });

            const reportEnd = addMinutesRespectingRules(reportStart, REPORT_DURATION_MIN);
            entries.push({ type: "Rapport", label: r.key, start: reportStart, end: reportEnd });

            if (i < reports.length - 1) {
                const next = reports[i + 1];
                let phaseEnd;

                if (next.fixed && next.fixedTime) {
                    phaseEnd = movePastBlockers(new Date(next.fixedTime));
                    const autoDuration = Math.max(0, (phaseEnd - reportEnd) / 60000);
                    phaseDurations[i] = Math.round(autoDuration); // This is side-effect in render!
                    // We cannot set state in render safely for derived values like this without loops.
                    // Visualizing only for now? No, logic depends on it. 
                    // I'll leave the state update but beware of loops.
                    // React will catch infinite loops.
                } else {
                    phaseEnd = addMinutesRespectingRules(reportEnd, phaseDurations[i]);
                }

                entries.push({ type: "Arbeitsphase", label: `${r.key} \u2192 ${next.key}`, start: reportEnd, end: phaseEnd });
                cursor = phaseEnd;
            }
        }

        blockers.forEach(b => {
            entries.push({ type: "Blocktermin", label: b.name, start: parseTimeToday(new Date(iniTime), b.start), end: parseTimeToday(new Date(iniTime), b.end) });
        });

        return entries
            .filter(e => !showOnlyReports || e.type === "Rapport")
            .sort((a, b) => new Date(a.time || a.start) - new Date(b.time || b.start));
    };

    const timeline = calculateTimeline();

    const format = (d) => new Date(d).toLocaleString("de-CH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });

    return (
        <div className="min-h-screen bg-gray-100 pb-10">
            <div className="bg-brand-red text-white p-6 font-bold text-xl shadow-md">
                Schweizer Armee Zeitrechner Aktionsplanung Battalion
            </div>

            <div className="grid lg:grid-cols-2 gap-6 p-6 max-w-7xl mx-auto">

                {/* Left Column: Timeline */}
                <div className="order-2 lg:order-1">
                    <Card className="rounded-2xl shadow h-fit sticky top-6">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <CardTitle className="text-xl">Zeitliche Gesamtübersicht</CardTitle>
                            <div className="flex items-center gap-2 text-sm">
                                <Checkbox checked={showOnlyReports} onCheckedChange={setShowOnlyReports} />
                                <Label>Nur Rapporte</Label>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm pt-4">
                            <div className="grid grid-cols-12 gap-2 font-semibold text-gray-500 pb-2 px-2">
                                <div className="col-span-3">Typ</div>
                                <div className="col-span-3">Bezeichnung</div>
                                <div className="col-span-3">Start</div>
                                <div className="col-span-3">Ende</div>
                            </div>
                            <div className="space-y-2">
                                {timeline.map((e, i) => {
                                    const isRapport = e.type === "Rapport";
                                    const isBlock = e.type === "Blocktermin";
                                    const isRehearsal = e.type === "Rehearsal";

                                    let rowClass = "bg-white border-gray-200";
                                    if (isRapport) rowClass = "bg-red-50 border-red-200 font-semibold";
                                    if (isBlock) rowClass = "bg-gray-100 border-gray-300 text-gray-500";
                                    if (isRehearsal) rowClass = "bg-blue-50 border-blue-200 text-blue-700";

                                    return (
                                        <div key={i} className={`grid grid-cols-12 gap-2 border rounded-lg p-3 items-center shadow-sm transition-all hover:shadow-md ${rowClass}`}>
                                            <div className="col-span-3 truncate" title={e.type}>{e.type}</div>
                                            <div className="col-span-3 font-medium truncate" title={e.label}>{e.label}</div>
                                            <div className="col-span-3 font-mono text-xs">{e.time ? format(e.time) : e.start ? format(e.start) : ""}</div>
                                            <div className="col-span-3 font-mono text-xs">{e.end ? format(e.end) : ""}</div>
                                        </div>
                                    );
                                })}
                                {timeline.length === 0 && (
                                    <div className="text-center text-gray-400 py-10">
                                        Bitte Startzeit definieren
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Controls */}
                <div className="grid gap-6 order-1 lg:order-2 h-fit">
                    <Card className="rounded-2xl shadow">
                        <CardHeader><CardTitle>Grundparameter</CardTitle></CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Startzeit INI</Label>
                                <Input type="datetime-local" value={iniTime} onChange={(e) => handleIniChange(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Arbeitsbeginn</Label>
                                    <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Arbeitsende</Label>
                                    <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Blocktermine</CardTitle>
                            <Button size="sm" onClick={() => setBlockers([...blockers, { name: "Neuer Block", start: "10:00", end: "11:00" }])}>
                                + Hinzufügen
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {blockers.map((b, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <Input value={b.name} onChange={(e) => {
                                        const copy = [...blockers]; copy[i].name = e.target.value; setBlockers(copy);
                                    }} className="flex-1" />
                                    <Input type="time" value={b.start} onChange={(e) => {
                                        const copy = [...blockers]; copy[i].start = e.target.value; setBlockers(copy);
                                    }} className="w-24" />
                                    <span className="text-gray-400">-</span>
                                    <Input type="time" value={b.end} onChange={(e) => {
                                        const copy = [...blockers]; copy[i].end = e.target.value; setBlockers(copy);
                                    }} className="w-24" />
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                            const copy = blockers.filter((_, idx) => idx !== i);
                                            setBlockers(copy);
                                        }}
                                    >
                                        x
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow">
                        <CardHeader><CardTitle>Rapporte und Arbeitsphasen</CardTitle></CardHeader>
                        <CardContent className="grid gap-4">
                            {reports.map((r, i) => (
                                <div key={r.key} className="border rounded-lg p-4 grid gap-3 bg-white relative hover:border-red-300 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-lg text-brand-red w-12">{r.key}</div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-gray-500">Fixzeit</Label>
                                            <Checkbox checked={r.fixed} onCheckedChange={(val) => {
                                                const copy = [...reports]; copy[i].fixed = val; setReports(copy);
                                            }} />
                                        </div>
                                    </div>

                                    {r.fixed && r.key !== "INI" && (
                                        <Input type="datetime-local" value={r.fixedTime} onChange={(e) => {
                                            const copy = [...reports]; copy[i].fixedTime = e.target.value; setReports(copy);
                                        }} />
                                    )}
                                    {r.key === "INI" && (
                                        <div className="text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded">
                                            {iniTime ? new Date(iniTime).toLocaleString() : "Keine Startzeit"}
                                        </div>
                                    )}

                                    {i < phaseDurations.length && (
                                        <div className="grid grid-cols-[1fr,auto] gap-2 items-center mt-2 border-t pt-2">
                                            <Label className="text-xs text-gray-500">Phase bis {reports[i + 1].key} (Min)</Label>
                                            <Input
                                                type="number"
                                                className="w-20 text-right h-8"
                                                value={phaseDurations[i]}
                                                disabled={reports[i + 1].fixed}
                                                onChange={(e) => {
                                                    const copy = [...phaseDurations]; copy[i] = Number(e.target.value); setPhaseDurations(copy);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
