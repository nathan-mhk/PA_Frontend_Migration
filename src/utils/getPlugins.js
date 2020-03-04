import isDev from './isDev';
import plugins from '../plugins';

export default plugins.map(({ id, ...rest }, index) => {
  if (isDev && id) {
    console.warn(
      'There is no need to provide id for plugin anymore in PathAdvisor version >= 1.3, it will be ignored.',
      `id got: ${id}`,
    );
  }

  if (isDev && !rest.core && !rest.name) {
    console.warn(
      'Non core plugin should provide a name in PathAdvisor version >= 1.3',
      'Plugin:',
      rest,
    );
  }

  return { id: `plugin_${index}`, ...rest };
});
