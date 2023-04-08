//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose=require("mongoose");
const ejs=require("ejs");
//const encrypt=require("mongoose-encryption")  // aes encryption
//const md5=require("md5"); //level 3
const bcrypt=require("bcrypt");
const saltRounds=10;


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

const userSchema=new mongoose.Schema({
  email: String,
  password: String
});


//userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ["password"] }); // Aes encryption  , hassing is btr so remove this .

const User=mongoose.model("User",userSchema);




app.get("/",function(req,res){
  res.render("home");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/register", function(req,res){

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
      // Store hash in your password DB.
      const newUser= new User({
        email: req.body.username,
        password: hash
      });
      newUser.save().then(function(){
        res.render("secrets");
      }).catch(function(err){
        res.send(err);
      })
  });


});


app.get("/login",function(req,res){
  res.render("login");
});



app.post("/login",function(req,res){
 const userName=req.body.username;
 const password=req.body.password;
 User.findOne({email:userName}).then(function(result){
   console.log(result);
   if(result){
     bcrypt.compare(password, result.password, function(err, results) {
    if(results == true){
      res.render("secrets");
    }
});
   }
 }).catch(function(err){
   res.send(err);
 })
});






let port=process.env.PORT;
if(port==null || port==""){
  port=3000;
}
app.listen(port, function() {
  console.log("Server started on port 3000");
});
