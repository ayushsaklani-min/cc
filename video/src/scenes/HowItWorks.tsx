import { AbsoluteFill, interpolate, Series, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, LINE, MONO, MUTED, PAPER } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Voice, Words } from "../kit";
import { DUR } from "../timing";

type StepId = "step1" | "step2" | "step3" | "step4";

/** The checks the policy engine applies, in order. */
const RULES = ["DOCUMENT TYPE", "ISSUER", "HOLDER NAME", "DOCUMENT DATE", "AMOUNT VS THRESHOLD"];

const Step: React.FC<{ id: StepId; index: string; title: string; line: string; children: React.ReactNode }> = ({ id, index, title, line, children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: IVORY }}>
      <Voice id={id} />
      <div style={{ position: "absolute", left: 150, top: 130, fontFamily: MONO, fontSize: 28, letterSpacing: "0.2em", color: MUTED }}>
        § 02 — HOW IT WORKS
      </div>
      <div style={{ position: "absolute", right: 150, top: 130, fontFamily: MONO, fontSize: 28, letterSpacing: "0.2em", color: INK }}>
        {index} / 04
      </div>

      <div style={{ position: "absolute", left: 150, top: 290, width: 860 }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontSize: 190,
            lineHeight: 0.9,
            color: LINE,
            opacity: interpolate(frame, [0, 22], [0, 1], { ...clamp, easing: OUT }),
          }}
        >
          {index}
        </div>
        <Words
          text={title}
          at={6}
          style={{ marginTop: 26, fontFamily: DISPLAY, fontSize: 104, whiteSpace: "nowrap", lineHeight: 1.02, letterSpacing: "-0.035em", color: INK }}
        />
        <div
          style={{
            marginTop: 34,
            fontFamily: DISPLAY,
            fontSize: 50,
            lineHeight: 1.25,
            color: MUTED,
            opacity: interpolate(frame, [22, 50], [0, 1], { ...clamp, easing: OUT }),
          }}
        >
          {line}
        </div>
      </div>

      <Camera duration={DUR[id]} to={1.06}>
        <div style={{ position: "absolute", right: 150, top: 250, width: 660, height: 640, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {children}
        </div>
      </Camera>
    </AbsoluteFill>
  );
};

const Upload: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 430,
        height: 560,
        backgroundColor: PAPER,
        border: `2px solid ${INK}`,
        padding: 40,
        boxSizing: "border-box",
        opacity: interpolate(frame, [14, 40], [0, 1], { ...clamp, easing: OUT }),
        translate: interpolate(frame, [14, 46], ["0px 90px", "0px 0px"], { ...clamp, easing: OUT }),
      }}
    >
      <div style={{ width: 130, height: 14, backgroundColor: INK, marginBottom: 40 }} />
      {[88, 70, 80, 56, 76, 44, 66].map((w, i) => (
        <div
          key={i}
          style={{
            height: 12,
            width: `${w}%`,
            backgroundColor: LINE,
            marginBottom: 30,
            transformOrigin: "left center",
            scale: interpolate(frame, [36 + i * 5, 56 + i * 5], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
          }}
        />
      ))}
    </div>
  );
};

const Rules: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: 640, borderTop: `2px solid ${INK}` }}>
      {RULES.map((rule, i) => (
        <div
          key={rule}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "30px 0",
            borderBottom: `1px solid ${LINE}`,
            opacity: interpolate(frame, [16 + i * 11, 36 + i * 11], [0, 1], { ...clamp, easing: OUT }),
            translate: interpolate(frame, [16 + i * 11, 36 + i * 11], ["-30px 0px", "0px 0px"], { ...clamp, easing: OUT }),
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", color: INK }}>{rule}</div>
          <div
            style={{
              width: 44,
              height: 44,
              backgroundColor: INK,
              color: IVORY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: 28,
              scale: interpolate(frame, [30 + i * 11, 44 + i * 11], [0, 1], { ...clamp, easing: OUT, output: "perceptual-scale" }),
            }}
          >
            ✓
          </div>
        </div>
      ))}
    </div>
  );
};

const Proof: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: 660 }}>
      <div
        style={{
          width: 300,
          border: `2px dashed ${MUTED}`,
          padding: 34,
          boxSizing: "border-box",
          backgroundColor: PAPER,
          opacity: interpolate(frame, [14, 38], [0, 1], { ...clamp, easing: OUT }),
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: MUTED, lineHeight: 1.4 }}>PRIVATE WITNESS</div>
        {[72, 90, 56].map((w, i) => (
          <div
            key={i}
            style={{
              marginTop: 26,
              height: 18,
              width: `${w}%`,
              backgroundColor: INK,
              transformOrigin: "left center",
              scale: interpolate(frame, [30 + i * 8, 52 + i * 8], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: 2,
          width: 110,
          backgroundColor: INK,
          transformOrigin: "left center",
          scale: interpolate(frame, [58, 78], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
        }}
      />
      <div
        style={{
          width: 250,
          height: 250,
          backgroundColor: INK,
          color: IVORY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: 34,
          letterSpacing: "0.2em",
          scale: interpolate(frame, [74, 96], [0, 1], { ...clamp, easing: OUT, output: "perceptual-scale" }),
        }}
      >
        PROOF
      </div>
    </div>
  );
};

const Chain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", width: 660 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i === 3 ? "none" : 1 }}>
          <div
            style={{
              width: 120,
              height: 120,
              flexShrink: 0,
              boxSizing: "border-box",
              border: `2px solid ${i === 3 ? INK : MUTED}`,
              backgroundColor: i === 3 ? INK : PAPER,
              color: IVORY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: 46,
              scale: interpolate(frame, [14 + i * 14, 34 + i * 14], [0, 1], { ...clamp, easing: OUT, output: "perceptual-scale" }),
            }}
          >
            {i === 3 ? "✓" : ""}
          </div>
          {i < 3 && (
            <div
              style={{
                height: 2,
                flex: 1,
                backgroundColor: INK,
                transformOrigin: "left center",
                scale: interpolate(frame, [26 + i * 14, 42 + i * 14], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const HowItWorks: React.FC = () => {
  return (
    <AbsoluteFill name="How it works" style={{ backgroundColor: IVORY }}>
      <Series>
        <Series.Sequence name="Step 1 — Submit" durationInFrames={DUR.step1}>
          <Step id="step1" index="01" title="Submit evidence" line="One upload. The user sees who will process it before anything is sent.">
            <Upload />
          </Step>
        </Series.Sequence>
        <Series.Sequence name="Step 2 — Evaluate" durationInFrames={DUR.step2}>
          <Step id="step2" index="02" title="Evaluate eligibility" line="Fixed, versioned rules decide. An oracle signs the result.">
            <Rules />
          </Step>
        </Series.Sequence>
        <Series.Sequence name="Step 3 — Prove" durationInFrames={DUR.step3}>
          <Step id="step3" index="03" title="Generate proof" line="The contract checks the oracle's signature inside the circuit.">
            <Proof />
          </Step>
        </Series.Sequence>
        <Series.Sequence name="Step 4 — Confirm" durationInFrames={DUR.step4}>
          <Step id="step4" index="04" title="Confirm on-chain" line="The transaction settles on Midnight. The status becomes queryable.">
            <Chain />
          </Step>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
