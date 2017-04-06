Template.dashboard.onCreated( () => {

});

Template.dashboard.helpers({
    savedTracks: function () {
        return Session.get('SavedTracks');
    },
    inventoryMatches: function () {
        // console.log('inventory: ', Session.get('InventoryMatches'));
        return Session.get('InventoryMatches');
    },
    email: function(){
        return Session.get('Email');
    },
    discogsWantlist:function(){
        return Session.get('discogsWantlist');
    },
    hasMatch: function(){
        var _this = this;
            var matches = Session.get('InventoryMatches');
            matches = matches.filter(function (match) {
               return match.artist == _this.artist_name;
            })
            return !!matches.length;
        // return Session.get('InventoryMatches');
    },
    discogsMatch:function(){
      if(!_.isUndefined(this.discogsId)){
        // console.log('this: ', this)
        return true;
      }

    },

    discogsUrl:function(){
      return 'https://www.discogs.com/release/' + this.discogsId
    }
})

Template.dashboard.events({
  'submit .spotify-search'(event) {
    // Prevent default browser form submit
    event.preventDefault();

    // Get value from form element
    const target = event.target;
    const email = target.text.value;

    // console.log('perform db query with', text)
    // console.log('email before client call: ', email)
    Meteor.call('getSpotifyActivity', email, function (err, res) {
        if (err) {
            console.log(err)
        } else {
            // console.log('res:', res.inventory);
            Session.set('SavedTracks', res.activity.latestAlbums);
            Session.set('InventoryMatches', res.inventory);
            Session.set('discogsWantlist', res.discogsWantlist);
            Session.set('Email', email);
        }
    })

    // Clear form
    target.text.value = '';
  },
});
