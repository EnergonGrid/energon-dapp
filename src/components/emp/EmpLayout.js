// src/components/emp/EmpLayout.js
import React from "react";
import Link from "next/link";

const LOGO_URL =
  "https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafybeiccfdp4aez6gqva5yx5cmixc7dugqxl6eee5nhb54sdhpnidpmt7u";

function HeroBanner() {
  return (
    <div className="empHeroWrap">
      <div className="empHeroFrame">
        <div className="empHeroInner">
          <img
            src={LOGO_URL}
            alt="Energon"
            className="empHeroLogo"
            draggable={false}
          />

          <div className="empHeroText">
            <div className="empHeroTitle">ENERGON</div>

            <div className="empHeroSubtitle">
              MANAGEMENT PROTOCOL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmpLayout({
  headerRight,
  children,
  showHero = true,
}) {
  return (
    <div style={ui.shell}>
      <style>{`
        .empHeroWrap {
          width: 100%;
          box-sizing: border-box;
          padding: 4px 16px 10px;
        }

        .empHeroFrame {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
        }

        .empHeroInner {
          width: 100%;
          min-height: 126px;

          display: flex;
          align-items: center;
          justify-content: center;

          box-sizing: border-box;

          padding: 10px 24px;
          gap: 12px;
        }

        .empHeroLogo {
          width: clamp(104px, 11vw, 126px);
          height: clamp(104px, 11vw, 126px);

          flex: 0 0 auto;
          display: block;

          border-radius: 50%;
          object-fit: cover;

          user-select: none;
          pointer-events: none;

          filter: none;
        }

        .empHeroText {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;

          text-align: center;
          gap: 6px;

          min-width: 0;
        }

        .empHeroTitle {
          color: #fff;

          font-size: clamp(32px, 4.3vw, 52px);
          font-weight: 950;
          letter-spacing: clamp(3.5px, 0.55vw, 6.8px);
          line-height: 1;

          white-space: nowrap;

          text-shadow: 0 0 4px rgba(255, 255, 255, 0.18);
        }

        .empHeroSubtitle {
          color: rgba(255, 255, 255, 0.82);

          font-size: clamp(8px, 1vw, 13px);
          font-weight: 900;
          letter-spacing: clamp(1.8px, 0.38vw, 4.8px);
          line-height: 1.1;

          white-space: nowrap;
        }

        @media (max-width: 720px) {
          .empHeroWrap {
            padding: 2px 12px 8px;
          }

          .empHeroFrame {
            border-radius: 14px;
          }

          .empHeroInner {
            min-height: 124px;
            flex-direction: row;
            padding: 10px 12px;
            gap: 8px;
          }

          .empHeroLogo {
            width: 92px;
            height: 92px;
          }

          .empHeroTitle {
            font-size: clamp(26px, 8vw, 36px);
            letter-spacing: clamp(2.8px, 1vw, 4.5px);
          }

          .empHeroSubtitle {
            font-size: clamp(7px, 2.1vw, 9px);
            letter-spacing: clamp(1.5px, 0.7vw, 2.8px);
          }
        }

        @media (max-width: 480px) {
          .empHeroInner {
            min-height: 120px;
            padding: 10px 8px;
            gap: 6px;
          }

          .empHeroLogo {
            width: 78px;
            height: 78px;
          }

          .empHeroTitle {
            font-size: 27px;
            letter-spacing: 3px;
          }

          .empHeroSubtitle {
            font-size: 7px;
            letter-spacing: 1.7px;
          }
        }

        @media (max-width: 390px) {
          .empHeroWrap {
            padding-left: 8px;
            padding-right: 8px;
          }

          .empHeroInner {
            min-height: 116px;
            padding: 8px 6px;
            gap: 4px;
          }

          .empHeroLogo {
            width: 70px;
            height: 70px;
          }

          .empHeroTitle {
            font-size: 24px;
            letter-spacing: 2.5px;
          }

          .empHeroSubtitle {
            font-size: 6.5px;
            letter-spacing: 1.4px;
          }
        }
      `}</style>

      <header style={ui.header}>
        <Link
          href="/dashboard"
          style={ui.dashboardButton}
        >
          ← Dashboard
        </Link>

        <div style={ui.headerRight}>
          {headerRight}
        </div>
      </header>

      <main style={ui.body}>
        {showHero ? <HeroBanner /> : null}
        {children}
      </main>
    </div>
  );
}

const ui = {
  shell: {
    minHeight: "100vh",
    background: "#000000",
    color: "#ffffff",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px 2px",
  },

  dashboardButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255, 200, 70, 0.38)",
    background:
      "linear-gradient(180deg, rgba(255, 190, 40, 0.18), rgba(80, 55, 10, 0.30))",
    color: "#ffd45c",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.4,
    boxShadow: "0 0 16px rgba(255, 190, 40, 0.10)",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },

  body: {
    padding: "0 0 28px",
  },
};