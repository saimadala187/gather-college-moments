//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const mongoStore=require("connect-mongo");
//const encrypt=require("mongoose-encryption")  // aes encryption
//const md5=require("md5"); //level 3
// const bcrypt=require("bcrypt");
// const saltRounds=10;

//****hasing and encrptying using passport ****//
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");
//const MongoStore = require('connect-mongo');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: "my scret key buddy.",
  resave: false,
  saveUninitialized: false,
  //store: new MongoStore({mongooseConnection: mongoose.connection}),
  store: mongoStore.create({
    mongoUrl:"mongodb+srv://saimadala1872:Madala187@cluster0.wyspesa.mongodb.net/userDB",
  }),
  cookie:{
    secure:false
  }
}));

app.use(passport.initialize());
app.use(passport.session());
 app.set("trust proxy", 1);

mongoose.connect("mongodb+srv://saimadala1872:Madala187@cluster0.wyspesa.mongodb.net/userDB", {
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret:[String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ["password"] }); // Aes encryption  , hassing is btr so remove this .

const User = mongoose.model("User", userSchema);
//user index from git hub //
User.collection.indexExists({ "username" : 1 }, function(err, results){
  console.log(results);
  if ( results === true) {
    // Dropping an Index in MongoDB
    User.collection.dropIndex( { "username" : 1 } , function(err, res) {
        if (err) {
            console.log('Error in dropping index!', err);
        }
    });
  } else {
    console.log("Index doesn't exisit!");
  }
});

//end//
passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
  process.nextTick(function() {
    done(null,  user.id);
    //console.log("serilize ########################",user);
  });
});

passport.deserializeUser(function(id, done) {
  // process.nextTick(function() {
  //   return cb(null, user);
  // });
  //console.log("id*************************************************************",id);
  User.findById(id).then(function(err, userd){
    process.nextTick(function() {
      return done(null, id);
      });
  }).catch(function(err){
    console.log("deser err",err);
  })
});

///oauth cofnig//
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://lazy-blue-viper-shoe.cyclic.app/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, done) {
    //console.log(profile);
    User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.get("/", function(req, res) {
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/login", function(req, res) {
  res.render("login",{parentPage:""});
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile',"email"] }));

app.get("/secrets", function(req, res) {
  if (req.isAuthenticated()) {
  User.find({"secret":{$ne:null}}).then(function(foundUsers){
  if(foundUsers){
    res.render("secrets",{usersWithSecrets:foundUsers})
  }
}).catch(function(err){
  console.log("secret error get",err);
});
//res.render("secrets");
}
else {
  //console.log(req.url);
  res.render("login",{parentPage:req.url});
}
});

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect scertes.
    res.redirect('/secrets');
  });

  app.get("/submit", function(req, res) {
    //console.log("get submit req-------------------------------------------------------------------------",req);
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  });





app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});


app.post("/submit",function(req,res){
 const userSecret=req.body.secret;
 //console.log(req);
 //console.log(req.user, userSecret);
 User.findById(req.user).then(function(userFind){
   if(userFind){
     User.updateOne({_id:userFind.id},
     {$push: {secret:userSecret}}).then(function(){
       //console.log("success",userFind.secret);
     }).catch(function(err){
       console.log(err);
     });

     //console.log(userFind.secret);
     //userFind.secret=userSecret;
     userFind.save().then(function(){
       console.log(userFind.secret,"before rend");
       res.redirect("secrets")
     }).catch(function(err){
       console.log(err);
     });
   }
 }).catch(function(err){
   console.log(err);
 });

});










app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        console.log("register authenticated");
        res.redirect("/secrets");
      });
    }
  });
});



app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        //console.log("login auth",req);
      req.session.save(() => {
      res.redirect('/secrets');
   });
        // res.redirect("/secrets");
      });
    }
  })


});






let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Server started on port 3000");
});
