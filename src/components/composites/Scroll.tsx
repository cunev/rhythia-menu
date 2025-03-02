import React, { useRef, useEffect, useState, ReactElement } from "react";
import BScroll from "@better-scroll/core";

const Scroll = ({ children, height }: { children: any; height: number }) => {
  const [scroll, setScroll] = useState<any>("");
  const container = useRef<any>(null);

  useEffect(() => {
    setScroll(
      new BScroll(container.current, {
        probeType: 3,
        pullUpLoad: true,
      })
    );
  }, []);

  return (
    <div style={{ height: height, overflow: "hidden" }} ref={container}>
      {children}
    </div>
  );
};

export default Scroll;
