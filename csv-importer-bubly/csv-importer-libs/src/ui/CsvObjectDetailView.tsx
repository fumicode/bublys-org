'use client';

import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import type { PlaneObject } from "@bublys-org/csv-importer-model";

type CsvObjectDetailViewProps = {
  object: PlaneObject;
};

export const CsvObjectDetailView: FC<CsvObjectDetailViewProps> = ({
  object,
}) => {
  const [showJson, setShowJson] = useState(false);

  const properties = useMemo(() => {
    return Object.entries(object)
      .filter(([key]) => key !== "id" && key !== "name")
      .map(([key, value]) => ({ key, value: String(value) }));
  }, [object]);

  return (
    <StyledDetail>
      <div className="e-header">
        <h3 className="e-title">{object.name}</h3>
        <button
          className={`e-json-btn ${showJson ? "active" : ""}`}
          onClick={() => setShowJson((v) => !v)}
        >
          JSON
        </button>
      </div>

      {showJson ? (
        <pre className="e-json">{JSON.stringify(object, null, 2)}</pre>
      ) : (
        <section className="e-section">
          <dl className="e-dl">
            {properties.map((prop, i) => (
              <span key={i} className="e-entry">
                <dt>{prop.key}</dt>
                <dd>{prop.value || "\u00A0"}</dd>
              </span>
            ))}
          </dl>
        </section>
      )}
    </StyledDetail>
  );
};

const StyledDetail = styled.div`
  padding: 16px;

  .e-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  .e-title {
    margin: 0;
    font-size: 1.25em;
  }

  .e-json-btn {
    padding: 4px 12px;
    border: 1px solid #90a4ae;
    border-radius: 4px;
    background: #eceff1;
    color: #546e7a;
    cursor: pointer;
    font-size: 0.8em;
    font-family: monospace;
    white-space: nowrap;

    &:hover {
      background: #cfd8dc;
    }

    &.active {
      background: #546e7a;
      color: #fff;
    }
  }

  .e-section {
    margin-bottom: 16px;
  }

  .e-dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;

    .e-entry {
      display: contents;
    }

    dt {
      color: #666;
      font-size: 0.9em;
      font-weight: bold;
    }

    dd {
      margin: 0;
      word-break: break-word;
    }
  }

  .e-json {
    margin: 0;
    padding: 12px;
    background: #263238;
    color: #eeffff;
    border-radius: 6px;
    font-size: 0.85em;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;
