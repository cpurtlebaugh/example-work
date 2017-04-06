// SyncedCron.add({
//   name:"Send Emails",
//   schedule : function(parser){
//     var recur = parser.recur().first().minute();
//     return recur;
//   },
//   job:function(){
//       if (!Meteor.settings.public.dev)
//         Meteor.call("getAllUsersSavedTracks");
//   }
// });

// SyncedCron.start();
