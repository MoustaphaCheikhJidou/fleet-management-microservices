const React = window.React;
const ReactDOMClient = window.ReactDOMClient;
const htm = window.htm;

if (!React || !ReactDOMClient || !htm) {
  throw new Error('Les bibliothèques React ne sont pas chargées.');
}

export { React, ReactDOMClient, htm };
