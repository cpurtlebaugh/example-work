// if (Meteor.isServer) {
  Meteor.publish('SpotifyActivity', function spotifyActivityPublication() {
    return SpotifyActivity.find({});
  });

  Meteor.publish('Recommend', function recommendPublication() {
    return Recommend.find({});
  });

  Meteor.publish('Inventory', function inventoryPublication() {
    return Inventory.find({});
  });
// }
