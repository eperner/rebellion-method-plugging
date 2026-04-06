import { useEffect, useMemo, useState } from "react";
import { casingCatalog, holeCatalog, tubingCatalog } from "./data/catalog";
import {
  CalculationError,
  calculateBalanced,
  calculateDisplacement,
  calculatePlug,
} from "./lib/calculations";
import { titleFromKind } from "./lib/format";
import { exportReportPdf } from "./lib/report";
import {
  defaultBalancedDraft,
  defaultDisplacementDraft,
  defaultPlugDraft,
  loadDrafts,
  loadReports,
  saveDrafts,
  saveReports,
} from "./lib/storage";
import type {
  BalancedDraft,
  CalculationResult,
  CalculatorKind,
  DisplacementDraft,
  LookupItem,
  MixedSegment,
  PersistedDrafts,
  PlugDraft,
  ReportRecord,
} from "./types";

type ResultState = Partial<Record<CalculatorKind, CalculationResult>>;

const calculatorCards: Array<{
  kind: CalculatorKind;
  title: string;
  subtitle: string;
  detail: string;
}> = [
  {
    kind: "displacement",
    title: "Displacement",
    subtitle: "Tubing displacement and bottoms-up",
    detail: "Quick depth-based displacement with casing/tubing lookups and optional mixed strings.",
  },
  {
    kind: "plug",
    title: "Perf and Seal",
    subtitle: "Packer and retainer workflows",
    detail: "Field-ready plug calculations with simplified inputs and legacy output matching.",
  },
  {
    kind: "balanced",
    title: "Balanced Plug",
    subtitle: "Four geometry modes, two solve modes",
    detail: "Step through casing, stub, and open-hole variants with explicit result cards.",
  },
];

function parseNumberOrEmpty(value: string): number | "" {
  if (value.trim() === "") {
    return "";
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function isPartialDecimal(value: string): boolean {
  return /^-?\d+\.$/.test(value) || value === "." || value === "-" || value === "-.";
}

function emptyTubingSegment(): MixedSegment {
  return { lengthFt: "", innerDiameterIn: "", outerDiameterIn: "" };
}

function emptyCasingSegment(): MixedSegment {
  return { lengthFt: "", innerDiameterIn: "" };
}

function App() {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorKind>("displacement");
  const [drafts, setDrafts] = useState<PersistedDrafts>(() => loadDrafts());
  const [results, setResults] = useState<ResultState>({});
  const [errors, setErrors] = useState<Partial<Record<CalculatorKind, string>>>({});
  const [reports, setReports] = useState<ReportRecord[]>(() => loadReports());
  const [advancedOpen, setAdvancedOpen] = useState<Record<CalculatorKind, boolean>>({
    displacement: false,
    plug: false,
    balanced: false,
  });

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  const reportList = useMemo(
    () => [...reports].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [reports],
  );

  function handleCalculation(kind: CalculatorKind) {
    try {
      const nextResult =
        kind === "displacement"
          ? calculateDisplacement(drafts.displacement)
          : kind === "plug"
            ? calculatePlug(drafts.plug)
            : calculateBalanced(drafts.balanced);

      setResults((current) => ({ ...current, [kind]: nextResult }));
      setErrors((current) => ({ ...current, [kind]: undefined }));
    } catch (error) {
      const message =
        error instanceof CalculationError ? error.message : "Something went wrong while calculating.";
      setErrors((current) => ({ ...current, [kind]: message }));
    }
  }

  async function handleExport(kind: CalculatorKind) {
    const result = results[kind];
    if (!result) {
      return;
    }

    const wellName =
      kind === "displacement"
        ? drafts.displacement.wellName
        : kind === "plug"
          ? drafts.plug.wellName
          : drafts.balanced.wellName;

    const record = await exportReportPdf(kind, wellName, result);
    setReports((current) => [record, ...current].slice(0, 12));
  }

  function resetCurrentDraft() {
    setResults((current) => ({ ...current, [activeCalculator]: undefined }));
    setErrors((current) => ({ ...current, [activeCalculator]: undefined }));

    setDrafts((current) => ({
      displacement:
        activeCalculator === "displacement" ? defaultDisplacementDraft() : current.displacement,
      plug: activeCalculator === "plug" ? defaultPlugDraft() : current.plug,
      balanced: activeCalculator === "balanced" ? defaultBalancedDraft() : current.balanced,
    }));
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="brand-block">
            <p className="eyebrow">Rebellion Energy Solutions</p>
            <h1>The Rebellion Method of Plugging</h1>
            <p className="brand-tagline">Field-ready cementing calculations</p>
          </div>
          <p className="hero-text">
            A cementing calculator that allows for validation and verification that The Rebellion
            Method of Plugging was followed and all cementing volumes are correct.
          </p>
        </div>
      </header>

      <section className="card-grid">
        {calculatorCards.map((card) => (
          <button
            key={card.kind}
            className={`calc-card ${activeCalculator === card.kind ? "is-active" : ""}`}
            onClick={() => setActiveCalculator(card.kind)}
            type="button"
          >
            <span className="card-title">{card.title}</span>
            <span className="card-subtitle">{card.subtitle}</span>
            <span className="card-detail">{card.detail}</span>
          </button>
        ))}
      </section>

      <main className="workspace">
        <section className="editor">
          <div className="section-header">
            <div>
              <p className="eyebrow">Calculator</p>
              <h2>{titleFromKind(activeCalculator)}</h2>
            </div>
            <div className="header-actions">
              <button type="button" className="ghost-button" onClick={resetCurrentDraft}>
                Reset draft
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  setAdvancedOpen((current) => ({
                    ...current,
                    [activeCalculator]: !current[activeCalculator],
                  }))
                }
              >
                {advancedOpen[activeCalculator] ? "Hide advanced" : "Show advanced"}
              </button>
            </div>
          </div>

          {activeCalculator === "displacement" && (
            <DisplacementForm
              draft={drafts.displacement}
              advancedOpen={advancedOpen.displacement}
              result={results.displacement}
              error={errors.displacement}
              onChange={(next) => setDrafts((current) => ({ ...current, displacement: next }))}
              onCalculate={() => handleCalculation("displacement")}
              onExport={() => handleExport("displacement")}
            />
          )}

          {activeCalculator === "plug" && (
            <PlugForm
              draft={drafts.plug}
              advancedOpen={advancedOpen.plug}
              result={results.plug}
              error={errors.plug}
              onChange={(next) => setDrafts((current) => ({ ...current, plug: next }))}
              onCalculate={() => handleCalculation("plug")}
              onExport={() => handleExport("plug")}
            />
          )}

          {activeCalculator === "balanced" && (
            <BalancedForm
              draft={drafts.balanced}
              advancedOpen={advancedOpen.balanced}
              result={results.balanced}
              error={errors.balanced}
              onChange={(next) => setDrafts((current) => ({ ...current, balanced: next }))}
              onCalculate={() => handleCalculation("balanced")}
              onExport={() => handleExport("balanced")}
            />
          )}
        </section>

        <aside className="sidebar">
          <section className="sidebar-panel">
            <div className="section-header compact">
              <div>
                <p className="eyebrow">Offline status</p>
                <h3>Local-first</h3>
              </div>
            </div>
            <p className="sidebar-copy">
              Drafts and recent reports stay in local browser storage. When installed as a PWA, the
              app shell and seeded lookup tables remain available offline.
            </p>
          </section>

          <section className="sidebar-panel">
            <div className="section-header compact">
              <div>
                <p className="eyebrow">Recent reports</p>
                <h3>History</h3>
              </div>
            </div>
            <div className="history-list">
              {reportList.length === 0 && (
                <p className="empty-state">Export a PDF to pin the latest field reports here.</p>
              )}
              {reportList.map((report) => (
                <article className="history-item" key={report.id}>
                  <strong>{report.title}</strong>
                  <span>{new Date(report.createdAt).toLocaleString()}</span>
                  <p>{report.summary}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function DisplacementForm(props: {
  draft: DisplacementDraft;
  advancedOpen: boolean;
  result?: CalculationResult;
  error?: string;
  onChange: (draft: DisplacementDraft) => void;
  onCalculate: () => void;
  onExport: () => void;
}) {
  const { draft, onChange } = props;

  return (
    <div className="form-stack">
      <section className="form-panel">
        <div className="mode-toggle">
          <ModeButton active={draft.mode === "tubing-displacement"} onClick={() => onChange({ ...draft, mode: "tubing-displacement" })}>
            Tubing displacement
          </ModeButton>
          <ModeButton active={draft.mode === "bottoms-up"} onClick={() => onChange({ ...draft, mode: "bottoms-up" })}>
            Bottoms-up
          </ModeButton>
        </div>
        <div className="form-grid">
          <TextField label="Well name" value={draft.wellName} onChange={(value) => onChange({ ...draft, wellName: value })} />
          <NumberField label="Depth ft" value={draft.depthFt} onChange={(value) => onChange({ ...draft, depthFt: value })} />
          <LookupField
            label="Casing lookup"
            items={casingCatalog}
            onSelect={(item) => onChange({ ...draft, casingInnerDiameterIn: item.innerDiameterIn })}
          />
          <LookupField
            label="Tubing lookup"
            items={tubingCatalog}
            onSelect={(item) =>
              onChange({
                ...draft,
                tubingInnerDiameterIn: item.innerDiameterIn,
                tubingOuterDiameterIn: item.outerDiameterIn ?? draft.tubingOuterDiameterIn,
              })
            }
          />
          <NumberField
            label="Casing ID in"
            value={draft.casingInnerDiameterIn}
            onChange={(value) => onChange({ ...draft, casingInnerDiameterIn: value })}
          />
          <NumberField
            label="Tubing ID in"
            value={draft.tubingInnerDiameterIn}
            onChange={(value) => onChange({ ...draft, tubingInnerDiameterIn: value })}
          />
          <NumberField
            label="Tubing OD in"
            value={draft.tubingOuterDiameterIn}
            onChange={(value) => onChange({ ...draft, tubingOuterDiameterIn: value })}
          />
        </div>
      </section>

      {props.advancedOpen && (
        <AdvancedStrings
          casingSegments={draft.casingSegments}
          tubingSegments={draft.tubingSegments}
          onCasingChange={(segments) => onChange({ ...draft, casingSegments: segments })}
          onTubingChange={(segments) => onChange({ ...draft, tubingSegments: segments })}
        />
      )}

      <ActionRow onCalculate={props.onCalculate} onExport={props.onExport} result={props.result} error={props.error} />
      <ResultPanel result={props.result} />
    </div>
  );
}

function PlugForm(props: {
  draft: PlugDraft;
  advancedOpen: boolean;
  result?: CalculationResult;
  error?: string;
  onChange: (draft: PlugDraft) => void;
  onCalculate: () => void;
  onExport: () => void;
}) {
  const { draft, onChange } = props;

  return (
    <div className="form-stack">
      <section className="form-panel">
        <div className="mode-toggle">
          <ModeButton active={draft.mode === "packer"} onClick={() => onChange({ ...draft, mode: "packer" })}>
            Packer
          </ModeButton>
          <ModeButton active={draft.mode === "retainer"} onClick={() => onChange({ ...draft, mode: "retainer" })}>
            Retainer
          </ModeButton>
        </div>
        <div className="form-grid">
          <TextField label="Well name" value={draft.wellName} onChange={(value) => onChange({ ...draft, wellName: value })} />
          <LookupField label="Casing lookup" items={casingCatalog} onSelect={(item) => onChange({ ...draft, casingInnerDiameterIn: item.innerDiameterIn })} />
          <LookupField
            label="Tubing lookup"
            items={tubingCatalog}
            onSelect={(item) =>
              onChange({
                ...draft,
                tubingInnerDiameterIn: item.innerDiameterIn,
                tubingOuterDiameterIn: item.outerDiameterIn ?? draft.tubingOuterDiameterIn,
              })
            }
          />
          <NumberField label="Casing ID in" value={draft.casingInnerDiameterIn} onChange={(value) => onChange({ ...draft, casingInnerDiameterIn: value })} />
          <NumberField label="Tubing ID in" value={draft.tubingInnerDiameterIn} onChange={(value) => onChange({ ...draft, tubingInnerDiameterIn: value })} />
          <NumberField label="Tubing OD in" value={draft.tubingOuterDiameterIn} onChange={(value) => onChange({ ...draft, tubingOuterDiameterIn: value })} />
          <NumberField label="Bottom inj depth ft" value={draft.bottomInjectionDepthFt} onChange={(value) => onChange({ ...draft, bottomInjectionDepthFt: value })} />
          <NumberField label="Top inj depth ft" value={draft.topInjectionDepthFt} onChange={(value) => onChange({ ...draft, topInjectionDepthFt: value })} />

          {draft.mode === "packer" ? (
            <>
              <NumberField label="Plug length ft" value={draft.plugLengthFt} onChange={(value) => onChange({ ...draft, plugLengthFt: value })} />
              <NumberField label="Cement in tubing bbl" value={draft.cementInTubingBbl} onChange={(value) => onChange({ ...draft, cementInTubingBbl: value })} />
            </>
          ) : (
            <>
              <NumberField label="Total cement mixed bbl" value={draft.totalCementMixedBbl} onChange={(value) => onChange({ ...draft, totalCementMixedBbl: value })} />
              <NumberField label="Initial injection bbl" value={draft.initialInjectionBbl} onChange={(value) => onChange({ ...draft, initialInjectionBbl: value })} />
              <NumberField label="Hesitation 1 bbl" value={draft.hesitationOneBbl} onChange={(value) => onChange({ ...draft, hesitationOneBbl: value })} />
              <NumberField label="Hesitation 2 bbl" value={draft.hesitationTwoBbl} onChange={(value) => onChange({ ...draft, hesitationTwoBbl: value })} />
              <NumberField label="Perforation length ft" value={draft.perforationLengthFt} onChange={(value) => onChange({ ...draft, perforationLengthFt: value })} />
              <NumberField label="Retainer depth ft" value={draft.retainerDepthFt} onChange={(value) => onChange({ ...draft, retainerDepthFt: value })} />
            </>
          )}
        </div>
      </section>

      {props.advancedOpen && (
        <AdvancedStrings
          casingSegments={draft.casingSegments}
          tubingSegments={draft.tubingSegments}
          onCasingChange={(segments) => onChange({ ...draft, casingSegments: segments })}
          onTubingChange={(segments) => onChange({ ...draft, tubingSegments: segments })}
        />
      )}

      <ActionRow onCalculate={props.onCalculate} onExport={props.onExport} result={props.result} error={props.error} />
      <ResultPanel result={props.result} />
    </div>
  );
}

function BalancedForm(props: {
  draft: BalancedDraft;
  advancedOpen: boolean;
  result?: CalculationResult;
  error?: string;
  onChange: (draft: BalancedDraft) => void;
  onCalculate: () => void;
  onExport: () => void;
}) {
  const { draft, onChange } = props;
  const needsHole = draft.parameter !== "casing";
  const needsStub = draft.parameter === "stub-open-hole" || draft.parameter === "stub-open-hole-casing";
  const needsHoleLength = draft.parameter === "stub-open-hole-casing";
  const needsCasingLength = draft.parameter === "open-hole-casing";

  return (
    <div className="form-stack">
      <section className="form-panel">
        <div className="form-grid">
          <TextField label="Well name" value={draft.wellName} onChange={(value) => onChange({ ...draft, wellName: value })} />
          <SelectField
            label="Geometry"
            value={draft.parameter}
            options={[
              { value: "casing", label: "Casing" },
              { value: "stub-open-hole", label: "Stub open hole" },
              { value: "stub-open-hole-casing", label: "Stub open hole casing" },
              { value: "open-hole-casing", label: "Open hole casing" },
            ]}
            onChange={(value) => onChange({ ...draft, parameter: value as BalancedDraft["parameter"] })}
          />
          <SelectField
            label="Solve by"
            value={draft.solveMode}
            options={[
              { value: "depth", label: "Plug top depth" },
              { value: "volume", label: "Plug volume" },
            ]}
            onChange={(value) => onChange({ ...draft, solveMode: value as BalancedDraft["solveMode"] })}
          />
          <NumberField label="Base depth ft" value={draft.baseDepthFt} onChange={(value) => onChange({ ...draft, baseDepthFt: value })} />
          <LookupField label="Casing lookup" items={casingCatalog} onSelect={(item) => onChange({ ...draft, casingInnerDiameterIn: item.innerDiameterIn })} />
          <LookupField
            label="Tubing lookup"
            items={tubingCatalog}
            onSelect={(item) =>
              onChange({
                ...draft,
                tubingInnerDiameterIn: item.innerDiameterIn,
                tubingOuterDiameterIn: item.outerDiameterIn ?? draft.tubingOuterDiameterIn,
              })
            }
          />
          <NumberField label="Casing ID in" value={draft.casingInnerDiameterIn} onChange={(value) => onChange({ ...draft, casingInnerDiameterIn: value })} />
          <NumberField label="Tubing ID in" value={draft.tubingInnerDiameterIn} onChange={(value) => onChange({ ...draft, tubingInnerDiameterIn: value })} />
          <NumberField label="Tubing OD in" value={draft.tubingOuterDiameterIn} onChange={(value) => onChange({ ...draft, tubingOuterDiameterIn: value })} />

          {needsHole && (
            <>
              <LookupField label="Hole lookup" items={holeCatalog} onSelect={(item) => onChange({ ...draft, holeDiameterIn: item.innerDiameterIn })} />
              <NumberField label="Hole ID in" value={draft.holeDiameterIn} onChange={(value) => onChange({ ...draft, holeDiameterIn: value })} />
            </>
          )}

          {needsStub && (
            <>
              <NumberField label="Stub ID in" value={draft.stubInnerDiameterIn} onChange={(value) => onChange({ ...draft, stubInnerDiameterIn: value })} />
              <NumberField label="Plug length in stub ft" value={draft.plugLengthInStubFt} onChange={(value) => onChange({ ...draft, plugLengthInStubFt: value })} />
            </>
          )}

          {needsHoleLength && (
            <NumberField label="Plug length in hole ft" value={draft.plugLengthInHoleFt} onChange={(value) => onChange({ ...draft, plugLengthInHoleFt: value })} />
          )}

          {needsCasingLength && (
            <NumberField label="Plug length in casing ft" value={draft.plugLengthInCasingFt} onChange={(value) => onChange({ ...draft, plugLengthInCasingFt: value })} />
          )}

          {draft.solveMode === "depth" ? (
            <NumberField label="Plug top depth ft" value={draft.plugTopDepthFt} onChange={(value) => onChange({ ...draft, plugTopDepthFt: value })} />
          ) : (
            <NumberField label="Plug volume bbl" value={draft.plugVolumeBbl} onChange={(value) => onChange({ ...draft, plugVolumeBbl: value })} />
          )}
        </div>
      </section>

      {props.advancedOpen && (
        <AdvancedStrings
          casingSegments={draft.casingSegments}
          tubingSegments={draft.tubingSegments}
          onCasingChange={(segments) => onChange({ ...draft, casingSegments: segments })}
          onTubingChange={(segments) => onChange({ ...draft, tubingSegments: segments })}
        />
      )}

      <ActionRow onCalculate={props.onCalculate} onExport={props.onExport} result={props.result} error={props.error} />
      <ResultPanel result={props.result} />
    </div>
  );
}

function AdvancedStrings(props: {
  casingSegments: MixedSegment[];
  tubingSegments: MixedSegment[];
  onCasingChange: (segments: MixedSegment[]) => void;
  onTubingChange: (segments: MixedSegment[]) => void;
}) {
  return (
    <section className="form-panel advanced-panel">
      <div className="section-header compact">
        <div>
          <p className="eyebrow">Advanced</p>
          <h3>Mixed string overrides</h3>
        </div>
      </div>
      <p className="sidebar-copy">
        Use these only when the string changes diameter by section. Segment lengths must add up to
        the calculator depth field they override.
      </p>
      <MixedStringEditor
        label="Mixed casing string"
        segments={props.casingSegments}
        onChange={props.onCasingChange}
        showOuterDiameter={false}
      />
      <MixedStringEditor
        label="Mixed tubing string"
        segments={props.tubingSegments}
        onChange={props.onTubingChange}
        showOuterDiameter
      />
    </section>
  );
}

function MixedStringEditor(props: {
  label: string;
  segments: MixedSegment[];
  onChange: (segments: MixedSegment[]) => void;
  showOuterDiameter: boolean;
}) {
  return (
    <div className="mixed-editor">
      <div className="mixed-header">
        <strong>{props.label}</strong>
        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            props.onChange([
              ...props.segments,
              props.showOuterDiameter ? emptyTubingSegment() : emptyCasingSegment(),
            ])
          }
        >
          Add segment
        </button>
      </div>
      {props.segments.length === 0 && <p className="empty-state">No override segments added.</p>}
      {props.segments.map((segment, index) => (
        <div className="segment-row" key={`${props.label}-${index}`}>
          <DecimalField
            label="Length ft"
            value={segment.lengthFt}
            onChange={(value) =>
              props.onChange(
                props.segments.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, lengthFt: value } : entry,
                ),
              )
            }
          />
          <DecimalField
            label="Inner diameter in"
            value={segment.innerDiameterIn}
            onChange={(value) =>
              props.onChange(
                props.segments.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, innerDiameterIn: value } : entry,
                ),
              )
            }
          />
          {props.showOuterDiameter && (
            <DecimalField
              label="Outer diameter in"
              value={segment.outerDiameterIn ?? ""}
              onChange={(value) =>
                props.onChange(
                  props.segments.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, outerDiameterIn: value } : entry,
                  ),
                )
              }
            />
          )}
          <button
            type="button"
            className="danger-button"
            onClick={() => props.onChange(props.segments.filter((_, entryIndex) => entryIndex !== index))}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function ActionRow(props: {
  onCalculate: () => void;
  onExport: () => void;
  result?: CalculationResult;
  error?: string;
}) {
  return (
    <div className="action-row">
      <div className="action-buttons">
        <button type="button" className="primary-button" onClick={props.onCalculate}>
          Calculate
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={props.onExport}
          disabled={!props.result}
        >
          Export PDF
        </button>
      </div>
      {props.error && <p className="error-banner">{props.error}</p>}
    </div>
  );
}

function ResultPanel(props: { result?: CalculationResult }) {
  if (!props.result) {
    return (
      <section className="result-panel empty">
        <p className="empty-state">Run a calculation to see the field-ready output card.</p>
      </section>
    );
  }

  return (
    <section className="result-panel">
      <div className="section-header compact">
        <div>
          <p className="eyebrow">Results</p>
          <h3>{props.result.subtitle}</h3>
        </div>
      </div>
      <div className="result-grid">
        {props.result.primary.map((field) => (
          <article className="result-card primary" key={field.label}>
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </article>
        ))}
      </div>
      <div className="result-grid secondary">
        {props.result.secondary.map((field) => (
          <article className="result-card" key={field.label}>
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </article>
        ))}
      </div>
      <p className="sidebar-copy">{props.result.reportSummary}</p>
    </section>
  );
}

function ModeButton(props: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className={`mode-button ${props.active ? "is-active" : ""}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}

function NumberField(props: {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        inputMode="decimal"
        value={props.value}
        onChange={(event) => props.onChange(parseNumberOrEmpty(event.target.value))}
      />
    </label>
  );
}

function DecimalField(props: {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
}) {
  const [textValue, setTextValue] = useState<string>(props.value === "" ? "" : String(props.value));

  useEffect(() => {
    setTextValue(props.value === "" ? "" : String(props.value));
  }, [props.value]);

  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        inputMode="decimal"
        value={textValue}
        onChange={(event) => {
          const nextText = event.target.value;
          setTextValue(nextText);

          if (nextText.trim() === "") {
            props.onChange("");
            return;
          }

          if (isPartialDecimal(nextText)) {
            return;
          }

          const parsed = parseNumberOrEmpty(nextText);
          if (parsed !== "") {
            props.onChange(parsed);
          }
        }}
        onBlur={() => {
          const parsed = parseNumberOrEmpty(textValue);
          if (textValue.trim() === "") {
            props.onChange("");
            setTextValue("");
            return;
          }

          if (parsed === "") {
            setTextValue(props.value === "" ? "" : String(props.value));
            return;
          }

          props.onChange(parsed);
          setTextValue(String(parsed));
        }}
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LookupField(props: {
  label: string;
  items: LookupItem[];
  onSelect: (item: LookupItem) => void;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <select
        defaultValue=""
        onChange={(event) => {
          const item = props.items.find((entry) => entry.id === event.target.value);
          if (item) {
            props.onSelect(item);
          }
        }}
      >
        <option value="">Select a seeded value</option>
        {props.items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default App;
