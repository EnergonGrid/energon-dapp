import React from "react";

export default function PanelCard({
  title,
  children,
  right = null,
  footer = null,
  className = "",
  style = {},
}) {
  return (
    <section className={`emp-panel ${className}`.trim()} style={style}>
      <div className="emp-panel__header">
        <h3 className="emp-panel__title">{title}</h3>
        {right ? <div className="emp-panel__right">{right}</div> : null}
      </div>

      <div className="emp-panel__body">{children}</div>

      {footer ? <div className="emp-panel__footer">{footer}</div> : null}
    </section>
  );
}