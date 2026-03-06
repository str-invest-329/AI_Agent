import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansTC";

const { fontFamily } = loadFont();

const BRAND_RED = "#C02734";
const BG_DARK = "#0D0608";

const LOGO_SIZE = 180;
const GAP = 52;
const TEXT_MAX_WIDTH = 460;
const MAIN_FONT_SIZE = 108;
const SUB_FONT_SIZE = 32;

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // BG 淡入（0 → 15f）
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 展開進度：logo 左移 + 文字右展，同步從中心出發（15 → 62f）
  const expandProgress = interpolate(frame, [15, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Logo 淡入（15 → 35f）
  const logoOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo 從中心（+256px）往左移動到最終位置（0）
  // 256 = (GAP + TEXT_MAX_WIDTH) / 2
  const logoTranslateX = (1 - expandProgress) * ((GAP + TEXT_MAX_WIDTH) / 2);

  // 文字容器寬度：0 → TEXT_MAX_WIDTH（拉鍊從中心往右展開）
  const textWidth = expandProgress * TEXT_MAX_WIDTH;

  // SINCE 1989 淡入（50 → 68f）
  const subOpacity = interpolate(frame, [50, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 分隔線高度（15 → 50f）
  const dividerHeight = interpolate(frame, [15, 50], [0, LOGO_SIZE * 0.65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 結尾淡出（78 → 90f）
  const fadeOut = interpolate(frame, [78, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // logoScale 保留輕微 spring 質感
  const logoScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
    durationInFrames: 30,
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 60%, #1A0A0C 0%, ${BG_DARK} 65%)`,
        opacity: bgOpacity * fadeOut,
      }}
    >
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {/* Logo 圖標 */}
          <div
            style={{
              transform: `translateX(${logoTranslateX}px) scale(${logoScale})`,
            // logo 從中心往左展開（logoTranslateX 從 +256 → 0）
              opacity: logoOpacity,
              flexShrink: 0,
              filter: `drop-shadow(0 4px 24px ${BRAND_RED}66)`,
            }}
          >
            <img
              src={staticFile("khouse_LOGO.png")}
              style={{ width: LOGO_SIZE, display: "block" }}
            />
          </div>

          {/* 分隔線 */}
          <div
            style={{
              width: 2,
              height: dividerHeight,
              background: `linear-gradient(180deg, transparent, ${BRAND_RED}BB, transparent)`,
              margin: `0 ${GAP / 2}px`,
              flexShrink: 0,
            }}
          />

          {/* 文字區塊：overflow hidden + 寬度增長 = 拉鍊效果 */}
          <div
            style={{
              overflow: "hidden",
              width: textWidth,
              flexShrink: 0,
            }}
          >
            {/* translateX 讓內容右緣固定，展開時從右（産）往左（喬）出現 */}
            <div
              style={{
                width: TEXT_MAX_WIDTH,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                transform: `translateX(${textWidth - TEXT_MAX_WIDTH}px)`,
              }}
            >
              <div
                style={{
                  fontFamily,
                  fontWeight: 700,
                  fontSize: MAIN_FONT_SIZE,
                  color: "#E8E0D8",
                  letterSpacing: 6,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                喬大地產
              </div>
              <div
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 400,
                  fontSize: SUB_FONT_SIZE,
                  color: "#B0A090",
                  letterSpacing: 10,
                  whiteSpace: "nowrap",
                  opacity: subOpacity,
                  paddingLeft: 2,
                }}
              >
                SINCE 1989
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* 底部品牌橫線 */}
      <div
        style={{
          position: "absolute",
          bottom: "14%",
          left: "50%",
          transform: "translateX(-50%)",
          width: expandProgress * 480,
          height: 1.5,
          background: `linear-gradient(90deg, transparent, ${BRAND_RED}88, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
