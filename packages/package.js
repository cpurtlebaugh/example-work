Package.describe({
  summary: 'Contains all your npm dependencies',
  version: '1.3.5',
  name: 'npm-container'
});

// Npm.depends({
//     'spotify-web-api-node': '2.3.5'
// });

Package.onUse( function( api ) {
  api.addFiles( 'npm-packages.js', [ 'server' ] );
});
