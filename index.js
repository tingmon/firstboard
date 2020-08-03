const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');
const mongoose = require('mongoose');
const session = require('express-session');

mongoose.connect('mongodb://localhost:27017/freeboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

var loginId = "";
var myApp = express();

myApp.use(bodyParser.urlencoded({extended: false}));
myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname + '/public'));
myApp.set('view engine', 'ejs');
myApp.use(session({
    secret: 'aadE%@)dfg2315djfEJ(#*@!$23dsvb',
    resave: false,
    saveUninitialized: true
}));

const Post = mongoose.model('Post',{
    postId: String,
    title: String,
    content: String,
    author: String,
    date: Date,
    postPassword: Number
});

const Account = mongoose.model('account',{
    id: String,
    password: String,
    email: String,
    phone: String
})

myApp.get('/', function(req, res){
    var passedMessage = req.session.valid;
    req.session.valid = null;

    if(req.session.userLoggedIn){
        Post.find({}).exec( (err, posts) => {
            res.render('index', {posts: posts})
        });
    }
    else{
        Post.find({}).exec( (err, posts) => {
            res.render('index', {posts: posts});
        });
    }
});


myApp.get('/join', function (req, res){
    if(loginId !== ""){
        res.render('index',  {message: `You've already logged in ${loginId}!`})
    }
    else{
        res.render('join');
    }

});

myApp.get('/note/:postid', function(req, res){
    var postid = req.params.postid;
    console.log('postid: ' + postid);
    Post.findById({_id: postid}).exec((err, post) => {
        console.log('error: ' + err);
        console.log('post: ' + post);
        if(post){
            res.render('note', {post: post});
        }
    });
});

function checkPostPassword(post){
    var input = window.prompt();
    if(input !== post.postPassword){
        res.redirect('/');
    }
}
myApp.get('/write/:postid', function(req, res){
    var postid = req.params.postid;
    Post.findById({_id: postid}).exec((err, post) => {
        console.log(post);
        if(post){
            res.render('write', {post: post});
        }
    });
})

myApp.post('/write/:postid', function(req, res){
    var postid = req.params.postid;
    Post.findById({_id: postid}).exec((err, post) => {
        post.title = req.body.title;
        post.content = req.body.content;
        post.postPassword = req.body.postPassword;
        post.date = Date.now();

        console.log(post);

        post.save().then(() => {
            res.render('index', {message: 'post revised successfully'});
        })


    })
})

myApp.get('/write', function(req, res){
    if(loginId == ""){
        req.session.valid = {message: 'You have to login first'};
        console.log(req.session.valid);
        res.redirect('/');
    }
    else{
        res.render('write', {message: `Welcome ${loginId}!`});
    }
})

myApp.post('/', function(req, res){
    var id = req.body.id;
    var password = req.body.password;

    Account.findOne({id: id, password: password}).exec((err, login) => {
        if(login){
            req.session.id = login.id;
            req.session.userLoggedIn = true;
            loginId = login.id;
            res.redirect('/');
        }
        else{
            res.render('index', {message: 'Wrong Input!'});
        }
    })
})

myApp.post('/note', function(req, res){
    var id = req.body.id;
    var password = req.body.password;

    Account.findOne({id: id, password: password}).exec((err, login) => {
        if(login){
            req.session.id = login.id;
            req.session.userLoggedIn = true;
            loginId = id;
            res.redirect('/note');
        }
        else{
            res.render('note', {message: 'Wrong Input!'});
        }
    })
})

var phoneRegex = /^\d{3}(\s|\-)\d{3,4}(\s|\-)\d{4}$/;
var emailRegex = /^(\d|\w)+\@(\d|\w)+\.(com|net|\w+)(\.kr|\.ca)?$/;
var passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*(\!|\@|\#|\$|\%|\^|\&|\*|\?|\/|\-|\+|\=|\~)).*$/;
var postPasswordRegex = /^\d{4}$/;


function checkRegex(value, regex){
    if(regex.test(value)){
        return true;
    }
    else{
        return false;
    }
}

function passwordValidator(value){
    if(value.length < 10){
        throw new Error('password should have more than 10 characters');
    }
    else if(!checkRegex(value, passwordRegex)){
        throw new Error('password should be a combination of lowercase, uppercase, number and special character');
    }
    return true;
}

function passwordConfirm(value, {req}){
    var password = req.body.password;
    if(password != value){
        throw new Error('Your input is not same with password');
    }
    return true;
}

function phoneValidator(value){
    if(!checkRegex(value, phoneRegex)){
        throw new Error('invalid phone number');
    }
    return true;
}

function emailValidator(value){
    if(!checkRegex(value, emailRegex)){
        throw new Error('invalid email format');
    }
    return true;
}

myApp.post('/join', [
    check('id', 'Enter ID').notEmpty(),
    check('password').custom(passwordValidator),
    check('passwordConfirm').custom(passwordConfirm),
    check('phone').custom(phoneValidator),
    check('email').custom(emailValidator)
], function (req, res){
    const joinErrors = validationResult(req);
    console.log(joinErrors);

    if(!joinErrors.isEmpty()){
        res.render('join', {joinErrors: joinErrors.array()});
    }
    else{
        var id = req.body.id;
        var password = req.body.password;
        var phone = req.body.phone;
        var email = req.body.email;

        var accountData = {
            id,
            password,
            phone,
            email
        }

        var newAccount = new Account(accountData);
        newAccount.save().then(()=>{
            res.render('index', {message: 'New member saved'});
        })
    }
});

function postPassword(value){
    if(!checkRegex(value, postPasswordRegex)){
        throw new Error('post password requires only 4-digits');
    }
    return true;
}

myApp.post('/write', [
    check('title', 'Enter title of your post').notEmpty(),
    check('content', 'Enter content').notEmpty(),
    check('postPassword').custom(postPassword)
], function (req, res){
    const postErrors = validationResult(req)

    if(!postErrors.isEmpty()){
        res.render('write', {postErrors: postErrors.array()});
    }
    else{
        var title = req.body.title;
        var content = req.body.content;
        var postPassword = req.body.postPassword;
        var postId = Post.length + 1;
        var author = loginId; 
        var date = Date.now();
        
        var postData = {
            postId: postId,
            title: title,
            content: content,
            postPassword: postPassword,
            author: author,
            date: date
        }

        console.log(postData);
    
        var newPost = new Post(postData);
        newPost.save().then(()=>{
            req.session.valid = {message: 'New post is updated'};
            res.redirect('/')
            //res.render('index', {message: 'New post is updated'});
        })
    }

})

myApp.listen(1235);
console.log('Checking... Website at port 1235...');