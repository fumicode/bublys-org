import { useState } from 'react';

export const MemoBody = () => {
  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  };
  const [inputParamsText, setInputParamsText] = useState('');
  return (
    <div>
      <textarea
        ref={(el) => {
          if (el) {
            autoResizeTextarea(el);
          }
        }}
        value={inputParamsText}
        spellCheck={false}
        onChange={(e) => {
          setInputParamsText(e.target.value);
          autoResizeTextarea(e.target);
        }}
        rows={3}
        placeholder="paramsを入力"
        style={{
          width: '100%',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          padding: '8.5px 14px',
          border: '1px solid rgba(0, 0, 0, 0.23)',
          borderRadius: '4px',
          resize: 'none',
          minHeight: 'calc(3 * 1.5em + 17px)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

export default MemoBody;
