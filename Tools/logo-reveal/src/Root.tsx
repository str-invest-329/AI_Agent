import React from "react";
import { Composition } from "remotion";
import { LogoReveal } from "./LogoReveal";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LogoReveal"
      component={LogoReveal}
      durationInFrames={90}   // 3 秒 @ 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
