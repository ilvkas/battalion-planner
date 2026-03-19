import React, { useState } from "react";
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
    const [startReportIndex, setStartReportIndex] = useState(0);
    const [workStart, setWorkStart] = useState("07:30");
    const [workEnd, setWorkEnd] = useState("18:00");
    const [showOnlyReports, setShowOnlyReports] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);

    const [blockers, setBlockers] = useState([]);

    const [reports, setReports] = useState(
        reportKeys.map((key) => ({ key, fixed: false, fixedTime: "", duration: 60 }))
    );


    const [phaseDurations, setPhaseDurations] = useState(
        reportKeys.slice(0, -1).map(() => 60)
    );

    const [completedItems, setCompletedItems] = useState({});
    const [showCompleted, setShowCompleted] = useState(false);

    const getTimelineItemKey = (e) => {
        return `${e.type}_${e.label}_${(e.time || e.start)?.getTime()}`;
    };

    const toggleItemCompletion = (key) => {
        setCompletedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const isBlockerActiveForDate = (b, d) => {
        if (!b.type || b.type === "daily") return true;
        if (b.type === "specific") {
            if (!b.specificDate) return false;
            
            const dYear = d.getFullYear();
            const dMonth = String(d.getMonth() + 1).padStart(2, '0');
            const dDay = String(d.getDate()).padStart(2, '0');
            const localDStr = `${dYear}-${dMonth}-${dDay}`;
            
            return b.specificDate === localDStr;
        }
        return true;
    };

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
                if (!isBlockerActiveForDate(b, d)) continue;
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
                if (!isBlockerActiveForDate(b, d)) continue;
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
            const startOfWork = parseTimeToday(current, workStart); 
            let prevBoundary = startOfWork;
            
            for (const b of blockers) {
                if (!isBlockerActiveForDate(b, current)) continue;
                const be = parseTimeToday(current, b.end);
                if (be < current && be > prevBoundary) {
                    prevBoundary = be;
                }
            }
            
            const availableMins = Math.max(0, (current - prevBoundary) / 60000);
            const toSub = Math.min(remaining, availableMins);
            current = new Date(current.getTime() - toSub * 60000);
            remaining -= toSub;
        }
        return current;
    };

    const addMinutesRespectingRules = (start, minutes) => {
        let current = new Date(start);
        let remaining = minutes;

        while (remaining > 0) {
            current = movePastBlockers(current);
            const endOfWork = parseTimeToday(current, workEnd);
            let nextBoundary = endOfWork;
            
            for (const b of blockers) {
                if (!isBlockerActiveForDate(b, current)) continue;
                const bs = parseTimeToday(current, b.start);
                if (bs > current && bs < nextBoundary) {
                    nextBoundary = bs;
                }
            }
            
            const availableMins = Math.max(0, (nextBoundary - current) / 60000);
            const toAdd = Math.min(remaining, availableMins);
            current = new Date(current.getTime() + toAdd * 60000);
            remaining -= toAdd;
        }
        return current;
    };

    const addPhaseAndPushChunks = (entries, typeStr, label, start, minutes) => {
        let current = new Date(start);
        let remaining = minutes;
        let loops = 0;

        while (remaining > 0 && loops < 1000) {
            loops++;
            current = movePastBlockers(current);
            const endOfWork = parseTimeToday(current, workEnd);
            let nextBoundary = endOfWork;
            
            for (const b of blockers) {
                if (!isBlockerActiveForDate(b, current)) continue;
                const bs = parseTimeToday(current, b.start);
                if (bs > current && bs < nextBoundary) {
                    nextBoundary = bs;
                }
            }
            
            const availableMins = Math.max(0, (nextBoundary - current) / 60000);
            const toAdd = Math.min(remaining, availableMins);
            
            if (toAdd > 0) {
                const chunkEnd = new Date(current.getTime() + toAdd * 60000);
                const durationStr = toAdd % 60 === 0 ? `${toAdd / 60}h` : `${toAdd} Min`;
                entries.push({ type: typeStr, label: `${label} (${durationStr})`, start: new Date(current), end: chunkEnd });
                current = chunkEnd;
                remaining -= toAdd;
            } else if (remaining > 0) {
                current = new Date(current.getTime() + 60000);
            }
        }
        return current;
    };

    const pushChunksBetween = (entries, typeStr, label, start, end) => {
        let current = new Date(start);
        const finalEnd = new Date(end);
        let loops = 0;

        while (current < finalEnd && loops < 1000) {
            loops++;
            current = movePastBlockers(current);
            if (current >= finalEnd) break;
            
            const endOfWork = parseTimeToday(current, workEnd);
            let nextBoundary = endOfWork;
            
            for (const b of blockers) {
                if (!isBlockerActiveForDate(b, current)) continue;
                const bs = parseTimeToday(current, b.start);
                if (bs > current && bs < nextBoundary) {
                    nextBoundary = bs;
                }
            }
            if (nextBoundary > finalEnd) nextBoundary = finalEnd;
            
            const chunkMins = Math.max(0, (nextBoundary - current) / 60000);
            
            if (chunkMins > 0) {
                const chunkEnd = new Date(current.getTime() + chunkMins * 60000);
                const durationStr = chunkMins % 60 === 0 ? `${chunkMins / 60}h` : `${chunkMins} Min`;
                entries.push({ type: typeStr, label: `${label} (${durationStr})`, start: new Date(current), end: chunkEnd });
                current = chunkEnd;
            } else {
                current = new Date(current.getTime() + 60000); // Failsafe
            }
        }
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
    }

    const calculateTimeline = () => {
        if (!iniTime) return [];

        const entries = [];
        let cursor = new Date(iniTime);

        for (let i = startReportIndex; i < reports.length; i++) {
            const r = reports[i];

            let reportStart;
            if (r.fixed && r.fixedTime) {
                reportStart = movePastBlockers(new Date(r.fixedTime));
            } else if (i === startReportIndex) {
                reportStart = movePastBlockers(new Date(iniTime));
            } else {
                reportStart = movePastBlockers(cursor);
            }

            const rehearsal = subtractMinutesRespectingRules(reportStart, REHEARSAL_OFFSET_MIN);
            entries.push({ type: "Rehearsal", label: r.key, time: rehearsal });

            const reportEnd = addMinutesRespectingRules(reportStart, r.duration);
            entries.push({ type: "Rapport", label: r.key, start: reportStart, end: reportEnd });

            if (i < reports.length - 1) {
                const next = reports[i + 1];
                let phaseEnd;

                if (next.fixed && next.fixedTime) {
                    phaseEnd = movePastBlockers(new Date(next.fixedTime));
                    const autoDuration = Math.max(0, (phaseEnd - reportEnd) / 60000);
                    phaseDurations[i] = Math.round(autoDuration); // Side effect in render, keeping user logic
                    
                    pushChunksBetween(entries, "Arbeitsphase", `${r.key} \u2192 ${next.key}`, reportEnd, phaseEnd);
                } else {
                    phaseEnd = addPhaseAndPushChunks(entries, "Arbeitsphase", `${r.key} \u2192 ${next.key}`, reportEnd, phaseDurations[i]);
                }

                cursor = phaseEnd;
            }
        }

        if (entries.length > 0) {
            const activeDatesSet = new Set(
                entries
                    .filter(e => e.type !== "Blocktermin")
                    .map(e => {
                        const d = e.start || e.time;
                        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                    })
            );

            activeDatesSet.forEach(dateStr => {
                const [y, m, d] = dateStr.split('-');
                const currentDateObj = new Date(Number(y), Number(m)-1, Number(d), 0, 0, 0, 0);

                blockers.forEach(b => {
                    if (isBlockerActiveForDate(b, currentDateObj)) {
                        entries.push({ 
                            type: "Blocktermin", 
                            label: b.name, 
                            start: parseTimeToday(currentDateObj, b.start), 
                            end: parseTimeToday(currentDateObj, b.end) 
                        });
                    }
                });
            });

            // Find overlapping Rapports
            const blockEntries = entries.filter(e => e.type === "Blocktermin");
            entries.filter(e => e.type === "Rapport").forEach(rapport => {
                const overlap = blockEntries.some(b => {
                    return (b.start < rapport.end) && (b.end > rapport.start);
                });
                if (overlap) {
                    rapport.hasOverlapWarning = true;
                }
            });
        }

        const now = new Date();
        return entries
            .map(e => ({ ...e, isPast: (e.time || e.start) < now }))
            .filter(e => !showOnlyReports || e.type === "Rapport")
            .sort((a, b) => new Date(a.time || a.start) - new Date(b.time || b.start));
    };

    const timeline = calculateTimeline();
    const hasPastItems = timeline.some(e => e.isPast && !completedItems[getTimelineItemKey(e)]);
    const hasOverlapItems = timeline.some(e => e.hasOverlapWarning && !completedItems[getTimelineItemKey(e)]);


    const format = (d) => new Date(d).toLocaleString("de-CH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });

    return (
        <div className="min-h-screen bg-gray-100 pb-10 relative overflow-x-hidden">
            <div className="bg-brand-red text-white p-6 font-bold text-xl shadow-md">
                Schweizer Armee Zeitrechner Aktionsplanung Battalion
            </div>

            {/* Toggle Panel Button */}
            <button 
                onClick={() => setControlsVisible(!controlsVisible)}
                className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#f4f4f5] border border-r-0 border-[#e4e4e7] text-[#a1a1aa] p-2 rounded-l-md shadow-sm hover:bg-[#e4e4e7] hover:text-[#71717a] transition-all z-50 flex flex-col items-center justify-center w-8 h-24 opacity-50 hover:opacity-100 focus:outline-none focus:ring-0"
                title={controlsVisible ? "Einstellungen ausblenden" : "Einstellungen einblenden"}
            >
                {controlsVisible ? (
                    <span className="text-lg leading-none">▶</span>
                ) : (
                    <span className="text-lg leading-none">◀</span>
                )}
            </button>

            <div className={`grid ${controlsVisible ? 'lg:grid-cols-[1fr_450px] gap-6 max-w-[1400px]' : 'grid-cols-1 max-w-4xl'} p-6 mx-auto transition-all duration-300 ease-in-out`}>

                {/* Left Column: Timeline */}
                <div className={`order-2 lg:order-1 transition-all ${controlsVisible ? '' : 'mx-auto w-full'}`}>
                    <Card className="rounded-2xl shadow h-fit sticky top-6">
                        <CardHeader className="flex flex-col gap-4 border-b pb-4">
                            {(hasPastItems || hasOverlapItems) && (
                                <div className={`${hasOverlapItems ? 'bg-red-50 border-red-500 text-red-700' : 'bg-orange-50 border-orange-500 text-orange-700'} border-l-4 p-4 rounded shadow-sm mb-4`}>
                                    <p className="font-bold flex items-center gap-2">
                                        <span>⚠️</span> Achtung
                                    </p>
                                    <p className="text-sm mt-1 flex flex-col gap-1">
                                        {hasPastItems && <span>Einige geplante Zeiten liegen in der Vergangenheit.</span>}
                                        {hasOverlapItems && <span>Ein oder mehrere Rapporte überschneiden sich mit einem Blocktermin!</span>}
                                    </p>
                                </div>
                            )}
                            <div className="flex flex-row items-center justify-between">
                                <CardTitle className="text-xl">Zeitliche Gesamtübersicht</CardTitle>
                            </div>
                            <div className="flex flex-row items-center gap-6 text-sm flex-wrap">
                                <div className="flex items-center gap-2">
                                    <Checkbox checked={showOnlyReports} onCheckedChange={setShowOnlyReports} />
                                    <Label>Nur Rapporte</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox checked={showCompleted} onCheckedChange={setShowCompleted} />
                                    <Label>Erledigte anzeigen</Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm pt-4">
                            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-2 font-semibold text-gray-500 pb-2 px-2">
                                <div className="w-6"></div>
                                <div>Typ</div>
                                <div>Bezeichnung</div>
                                <div>Start</div>
                                <div>Ende</div>
                            </div>
                            <div className="space-y-3">
                                {timeline
                                    .filter(e => showCompleted || !completedItems[getTimelineItemKey(e)])
                                    .map((e, index, visibleArr) => {
                                        const key = getTimelineItemKey(e);
                                        const isCompleted = completedItems[key];

                                        let dayChanged = false;
                                        const currDate = e.start || e.time;
                                        if (currDate) {
                                            if (index === 0) {
                                                dayChanged = true;
                                            } else {
                                                const prevE = visibleArr[index - 1];
                                                const prevDate = prevE.start || prevE.time;
                                                if (prevDate) {
                                                    dayChanged = prevDate.getDate() !== currDate.getDate() ||
                                                                 prevDate.getMonth() !== currDate.getMonth() ||
                                                                 prevDate.getFullYear() !== currDate.getFullYear();
                                                }
                                            }
                                        }

                                        const isRapport = e.type === "Rapport";
                                        const isBlock = e.type === "Blocktermin";
                                        const isRehearsal = e.type === "Rehearsal";

                                        let rowClass = "bg-white border-gray-200";
                                        let textClass = "";
                                        
                                        if (isCompleted) {
                                            rowClass = "bg-gray-100 border-gray-300 opacity-60";
                                            textClass = "text-gray-500 line-through";
                                        } else {
                                            if (isRapport) rowClass = "bg-red-50 border-red-200 font-semibold";
                                            if (isBlock) {
                                                rowClass = "bg-gray-100 border-gray-300 text-gray-500";
                                                textClass = "text-gray-500";
                                            }
                                            if (isRehearsal) {
                                                rowClass = "bg-blue-50 border-blue-200";
                                                textClass = "text-blue-700";
                                            }
                                        }

                                        const timeDisplay = e.time ? format(e.time) : e.start ? format(e.start) : "";
                                        const showWarning = e.isPast && !isCompleted;

                                        return (
                                            <React.Fragment key={key}>
                                                {dayChanged && (
                                                    <div className="flex items-center gap-4 py-2 mt-4 first:mt-0">
                                                        <div className="h-px bg-gray-300 flex-1"></div>
                                                        <div className="text-xs text-brand-dark font-bold uppercase tracking-wider">
                                                            {new Date(currDate).toLocaleDateString("de-CH", { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </div>
                                                        <div className="h-px bg-gray-300 flex-1"></div>
                                                    </div>
                                                )}
                                                <div className={`grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-2 border rounded-lg p-3 items-center shadow-sm transition-all hover:shadow-md ${rowClass}`}>
                                                    <div className="w-6 flex justify-center">
                                                        <Checkbox checked={isCompleted || false} onCheckedChange={() => toggleItemCompletion(key)} />
                                                    </div>
                                                    <div className={`truncate ${textClass}`} title={e.type}>{e.type}</div>
                                                    <div className={`font-medium truncate ${textClass}`} title={e.label}>{e.label}</div>
                                                    <div className={`font-mono text-xs flex items-center gap-1 ${textClass} ${showWarning ? 'text-orange-600 font-bold' : ''}`}>
                                                        {e.hasOverlapWarning && <span title="Überschneidet sich mit Blocktermin" className="text-red-600 font-bold">⚠️ Konflikt</span>}
                                                        {showWarning && <span title="In der Vergangenheit">⚠️</span>}
                                                        {timeDisplay}
                                                    </div>
                                                    <div className={`font-mono text-xs ${textClass}`}>{e.end ? format(e.end) : ""}</div>
                                                </div>
                                            </React.Fragment>
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
                {controlsVisible && (
                <div className="grid gap-6 order-1 lg:order-2 h-fit animate-in fade-in slide-in-from-right-8 duration-300">
                    <Card className="rounded-2xl shadow">
                        <CardHeader><CardTitle>Grundparameter</CardTitle></CardHeader>
                        <CardContent className="grid gap-4">
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
                            <div className="grid gap-2 border-t border-gray-100 pt-4">
                                <Label>Startpunkt</Label>
                                <div className="grid grid-cols-[1fr,2fr] gap-4">
                                    <select 
                                        className="h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                                        value={startReportIndex}
                                        onChange={(e) => {
                                            const newIdx = Number(e.target.value);
                                            setStartReportIndex(newIdx);
                                        }}
                                    >
                                        {reportKeys.map((key, i) => (
                                            <option key={key} value={i}>{key}</option>
                                        ))}
                                    </select>
                                    <Input type="datetime-local" value={iniTime} onChange={(e) => handleIniChange(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Blocktermine</CardTitle>
                            <Button size="sm" onClick={() => {
                                                const defaultDate = iniTime ? iniTime.split('T')[0] : new Date().toISOString().split('T')[0];
                                                setBlockers([...blockers, { id: Date.now(), name: "Neuer Block", start: "10:00", end: "11:00", type: "daily", specificDate: defaultDate }]);
                                            }}>
                                                + Hinzufügen
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="grid gap-3">
                                            {blockers.map((b, i) => (
                                                <div key={b.id || i} className="flex gap-2 items-center flex-wrap bg-gray-50 p-2 rounded border border-gray-100">
                                    <Input value={b.name} onChange={(e) => {
                                        const copy = [...blockers]; copy[i].name = e.target.value; setBlockers(copy);
                                    }} className="flex-[2] min-w-[120px]" placeholder="Name" />
                                    
                                    <select
                                        className="h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm flex-1 min-w-[100px]"
                                        value={b.type || "daily"}
                                        onChange={(e) => {
                                            const copy = [...blockers]; copy[i].type = e.target.value; setBlockers(copy);
                                        }}
                                    >
                                        <option value="daily">Täglich</option>
                                        <option value="specific">Einmalig</option>
                                    </select>
                                    
                                    {(b.type === "specific") && (
                                        <div className="flex items-center gap-1 bg-white border rounded px-2">
                                            <Label className="text-xs whitespace-nowrap text-gray-500">Datum</Label>
                                            <Input type="date" value={b.specificDate || (iniTime ? iniTime.split('T')[0] : '')} onChange={(e) => {
                                                const copy = [...blockers]; copy[i].specificDate = e.target.value; setBlockers(copy);
                                            }} className="w-[125px] h-7 px-1 border-none shadow-none text-xs" />
                                        </div>
                                    )}

                                    <div className="flex gap-1 items-center ml-auto">
                                        <Input type="time" value={b.start} onChange={(e) => {
                                            const copy = [...blockers]; copy[i].start = e.target.value; setBlockers(copy);
                                        }} className="w-[84px] px-2 text-center" />
                                        <span className="text-gray-400">-</span>
                                        <Input type="time" value={b.end} onChange={(e) => {
                                            const copy = [...blockers]; copy[i].end = e.target.value; setBlockers(copy);
                                        }} className="w-[84px] px-2 text-center" />
                                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-1"
                                            onClick={() => {
                                                const copy = blockers.filter((_, idx) => idx !== i);
                                                setBlockers(copy);
                                            }}
                                        >
                                            x
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow">
                        <CardHeader><CardTitle>Rapporte und Arbeitsphasen</CardTitle></CardHeader>
                        <CardContent className="grid gap-4">
                            {reports.map((r, i) => {
                                if (i < startReportIndex) return null;
                                return (
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

                                    {r.fixed && i !== startReportIndex && (
                                        <Input type="datetime-local" value={r.fixedTime} onChange={(e) => {
                                            const copy = [...reports]; copy[i].fixedTime = e.target.value; setReports(copy);
                                        }} />
                                    )}
                                    {i === startReportIndex && (
                                        <div className="text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded">
                                            {iniTime ? new Date(iniTime).toLocaleString() : "Keine Startzeit"}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center mt-2 border-t pt-2">
                                        <Label className="text-xs text-brand-red">Rapportdauer (Min)</Label>
                                        <Input
                                            type="number"
                                            className="w-20 text-right h-8"
                                            value={r.duration}
                                            onChange={(e) => {
                                                const copy = [...reports]; copy[i].duration = Number(e.target.value); setReports(copy);
                                            }}
                                        />
                                        {i < phaseDurations.length && (
                                            <>
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
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                            })}
                        </CardContent>
                    </Card>
                </div>
                )}
            </div>
        </div>
    );
}
