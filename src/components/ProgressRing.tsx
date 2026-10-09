import React, { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "@/lib/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A challenge's pot as a ring in the signature gradient: it sweeps to `ratio` (0–1) when it changes — a pledge landing —
 * and its content sits in the middle.
 */
export function ProgressRing({ ratio, size = 120, stroke = 10, children }: { ratio: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const { c, gradient } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, { toValue: Math.min(1, Math.max(0, ratio)), duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [ratio, progress]);
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            {gradient.map((color, i) => (
              <Stop key={color} offset={i / (gradient.length - 1)} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke="url(#ring)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </Svg>
      {children}
    </View>
  );
}
