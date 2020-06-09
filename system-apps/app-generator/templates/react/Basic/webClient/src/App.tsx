import * as React from 'react';
const styles = require('./App.css');
const indexStyles = require('./index.css');

class App extends React.Component<any, any> {
  private log: ZLUX.ComponentLogger;
  private svg: string;
  
  constructor(props){
    super(props);
    this.log = this.props.resources.logger;
    this.svg = ZoweZLUX.uriBroker.pluginResourceUri(this.props.resources.pluginDefinition.getBasePlugin(), 'assets/logo.svg');
  };
  
  public render() {
    return (
      <div className={`${styles.App} ${indexStyles.body}`}>
        <header className={styles['App-header']}>
          <img src={this.svg} className={styles['App-logo']} alt="logo" />
          <p className={styles['App-intro']}>
            Edit <code className={indexStyles.code}>src/App.tsx</code> and run <code>npm run start</code> to rebuild.
          </p>
          <a
            className={styles['App-link']}
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export default App;
