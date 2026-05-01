"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

type AnimatedNumberProps = {
  value: number | string;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
};

export function AnimatedNumber({
  value,
  className = "",
  duration = 0.8,
  prefix = "",
  suffix = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isString, setIsString] = useState(false);
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { 
    stiffness: 100, 
    damping: 20,
    duration 
  });
  
  // For string values (like "N/A"), we'll animate opacity instead
  useEffect(() => {
    if (typeof value === "string" && isNaN(Number(value))) {
      setIsString(true);
      setDisplayValue(0);
    } else {
      setIsString(false);
      const numValue = typeof value === "string" ? Number(value) : value;
      setDisplayValue(numValue);
      motionValue.set(numValue);
    }
  }, [value, motionValue]);

  if (isString) {
    return (
      <motion.span
        className={className}
        key={value}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {prefix}{value}{suffix}
      </motion.span>
    );
  }

  const animatedValue = useTransform(springValue, (latest) => Math.round(latest));

  return (
    <motion.span className={className}>
      {prefix}
      <motion.span>{animatedValue}</motion.span>
      {suffix}
    </motion.span>
  );
}
