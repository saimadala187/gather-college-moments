//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
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
  cookie:{
    //sameSite:'none',
    secure:false
  }
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://saimadala1872:Madala187@cluster0.wyspesa.mongodb.net/userDB", {
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ["password"] }); // Aes encryption  , hassing is btr so remove this .

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id).then(function(err, user) {
    done(err, user);
  });
});

///oauth cofnig//
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
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
  res.render("login");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/secrets", function(req, res) {
  // if (req.isAuthenticated()) {
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login");
  // }

User.find({"secret":{$ne:null}}).then(function(foundUsers){
  if(foundUsers){
    res.render("secrets",{usersWithSecrets:foundUsers})
  }
}).catch(function(err){
  console.log(err);
});

});

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect scertes.
    res.redirect('/secrets');
  });

  app.get("/submit", function(req, res) {
    console.log("get submit req-------------------------------------------------------------------------",req);
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
 console.log(req.user.id, userSecret);
 User.findById(req.user.id).then(function(userFind){
   if(userFind){
     userFind.secret=userSecret;
     userFind.save().then(function(){
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
        res.redirect("/secrets");
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
