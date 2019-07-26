const { resolve, basename } = require('path');
const {
  app, Menu, Tray, dialog,
} = require('electron');
const { spawn } = require('child_process');
const Store = require('electron-store');

const schema = {
  projects: {
    type: 'string',
  },
};
const isWindows = process.platform.includes('win');
const store = new Store({ schema });

if (app.dock) {
  app.dock.hide();
}

let tray = null;
let trayPosition = {};

function render() {
  const storedProjects = store.get('projects');
  const projects = storedProjects ? JSON.parse(storedProjects) : [];

  const items = projects.map(project => ({
    label: project.name,
    submenu: [
      {
        label: 'Open in VSCode',
        click: () => {
          spawn('code', [project.path], {
            cwd: process.cwd(),
            env: {
              PATH: process.env.PATH,
            },
            stdio: 'inherit',
            shell: isWindows,
          });
        },
      },
      {
        label: 'Remove',
        click: () => {
          store.set(
            'projects',
            JSON.stringify(projects.filter(item => item.path !== project.path)),
          );

          render();

          if (trayPosition) tray.popUpContextMenu(null, trayPosition);
        },
      },
    ],
  }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Add Project...',
      click: () => {
        const result = dialog.showOpenDialog({ properties: ['openDirectory'] });

        if (!result) return;

        const [path] = result;
        const name = basename(path);

        store.set(
          'projects',
          JSON.stringify([
            ...projects,
            {
              path,
              name,
            },
          ]),
        );

        render();
      },
    },
    {
      type: 'separator',
    },
    ...items,
    {
      type: 'separator',
    },
    {
      type: 'normal',
      label: 'Close',
      role: 'quit',
      enabled: true,
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', (event, boundaries, position) => {
    tray.popUpContextMenu();
    trayPosition = position;
  });
}

app.on('ready', () => {
  tray = new Tray(resolve(__dirname, 'assets', 'iconTemplate.png'));

  render();
});
