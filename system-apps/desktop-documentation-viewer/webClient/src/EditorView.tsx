import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import MonacoEditor from 'react-monaco-editor';

const styles = require('./EditorView.css');

const EditorView = () => {
  const history = useHistory();
  const location = useLocation();
  const passedInState = location?.state ?? { code: null, language: null };
  const { code, language } = passedInState;

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorViewHeader}>
        <div className={styles.editorViewTitle}>Editor</div>
        <div
          className={styles.backButton}
          onClick={() => history.push('/')}>{`< Back`}</div>
      </div>
      <div className={styles.editorWrapper}>
        <MonacoEditor
          width='100%'
          height='100vh'
          theme='vs-dark'
          value={code}
          defaultValue=''
          language={language}
          options={{
            selectOnLineNumbers: true,
            readOnly: true,
          }}
        />
      </div>
    </div>
  );
};

export default EditorView;
