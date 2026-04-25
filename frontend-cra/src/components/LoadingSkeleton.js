import React from "react";
import { motion } from "framer-motion";

export default function LoadingSkeleton() {
  return (
    <div className="skeletonRow">
      <div className="subCard">
        <ShimmerBlock style={{ height: 60, width: "60%" }} />
      </div>

      <div className="subCard">
        <ShimmerBlock style={{ height: 180, width: "100%" }} />
      </div>

      <div className="skeletonTwin">
        <div className="subCard">
          <ShimmerBlock style={{ height: 80, width: "100%" }} />
        </div>
        <div className="subCard">
          <ShimmerBlock style={{ height: 80, width: "100%" }} />
        </div>
      </div>
    </div>
  );
}

function ShimmerBlock({ style }) {
  return (
    <motion.div
      initial={false}
      className="skeletonBlock"
      style={style}
    >
      {/* shimmer handled by CSS ::after */}
    </motion.div>
  );
}

