// Phaser's core entry includes both renderers, input, tweens and both audio backends.
// Register the extra scene features used by the game and proof routes.
import Phaser from 'phaser-source/phaser-core.js';
import 'phaser-source/gameobjects/container/ContainerFactory.js';
import 'phaser-source/gameobjects/lights/LightsPlugin.js';
import Rectangle from 'phaser-source/geom/rectangle/index.js';
import loaderEvents from 'phaser-source/loader/events/index.js';

Phaser.Geom = { Rectangle };
Phaser.Loader.Events = loaderEvents;

export default Phaser;
