import { registerRootComponent } from 'expo';

import App from './App';

// Ponto de entrada padrão do SDK 57. Substitui o legado `expo/AppEntry.js`,
// que o `expo export` ainda resolvia mas que deixava `npx expo start` a
// servir 404 em `/index.bundle` — ou seja, quebrado em desenvolvimento.
registerRootComponent(App);
