import { v4 as uuidv4 } from 'uuid';

const Mutation = {
    createUser(parent, args, {db}, Info){
        const emailTaken = db.users.some(user => user.email === args.data.email)
        if(emailTaken) throw new Error("Email already taken by a user")
        
        const user = {
            id : uuidv4(),
            ...args.data
        }

        db.users.push(user);

        return user;
    },
    deleteUser(parent, args, {db}, info) {
        const userIndex = db.users.findIndex(user => user.id === args.id);

        if(userIndex === -1) throw new Error ("User does not exists");
        
        const deletedUsers= db.users.splice(userIndex, 1);

        db.posts = db.posts.filter(post =>{
            const match = post.author = args.id;

            if(match){
                db.comments = db.comments.filter(comment => {
                    comment.post !== db.posts.id;
                }) 
            }
            return !match;
        })
        db.comments = db.comments.filter(comment => comment.author !== args.id);
        return deletedUsers[0];
    },
    updateUser(parent, args, {db}, info){
        const {id, data} = args;

        const user = db.users.find((user) => user.id === id);
        
        if(!user) {
            throw new Error ("User not found");
        }

        if(typeof data.email ==='string'){
            const emailTaken = db.users.some(user => user.email === data.email)
            if(emailTaken) throw new Error('Email already in use')
            user.email = data.email;
        }
        
        if(typeof data.name ==='string') {
            user.name = data.name;
        }

        if(typeof data.age!== undefined) {
            user.age = data.age
        }

        return user;
    },
    createPost(parent, args, {db,pubsub}, Info){
        const userExists = db.users.some(user => user.id === args.data.author)
        if(!userExists) throw new Error("User already exists for this")
        
        const post = {
            id : uuidv4(),
            ...args.data
        }

        db.posts.push(post);
        
        if(args.data.published){
            pubsub.publish('post',{
                post :{ 
                    mutation: "CREATED",
                    data : post
                }
            })
        }

        return post;
    },
    deletePost(parent, args, {db,pubsub}, info) {
        const postIndex = db.posts.findIndex(post => post.id === args.id);

        if(postIndex === -1) throw new Error ("Post does not exists");
        
        const [post]= db.posts.splice(postIndex, 1);

        db.comments = db.comments.filter(comment => comment.author !== args.id);

        if(post.published){
            pubsub.publish('post',{
                post:{
                    mutaton: 'DELETED',
                    data: post
                }
            })
        }

        return deletedPosts[0];
    },
    updatePost(parent, args, {db,pubsub}, info){
        const {id, data} = args;

        const post = db.posts.find((post) => post.id === id);
        const originaPost = {...post};
        
        if(!post) {
            throw new Error ("Post not found");
        }

        if(typeof data.body ==='string'){
            post.body = data.body;
        }
        
        if(typeof data.title ==='string') {
            post.title = data.title;
        }

        if(typeof data.published ==='boolean') {
            post.published = data.published

            if(originaPost.published && !post.published) {
                pubsub.publish('post',{
                    post: {
                        mutation: 'DELETED',
                        data: originaPost
                    }
                })
            } else if(!originaPost.published && post.published){
                    pubsub.publish('post',{
                        post: {
                            mutation: 'CREATED',
                            data: post
                        }
                    })
            }
        } else if(post.published){
            pubsub.publish('post',{
                post: {
                    mutation: 'UPDATED',
                    data: post
                }
            })
        }

        return post;
    },
    createComment(parent, args, {db,pubsub}, Info){
        const userExists = db.users.some(user => user.id === args.data.author)
        if(!userExists) throw new Error("User already exists for this")
        const postExists = db.posts.some(post=> post.id === args.data.post && post.published===true)
        if(!postExists || !userExists) throw new Error("Post doesnt exists or user exists")

        const comment = {
            id : uuidv4(),
            ...args.data
        }

        db.comments.push(comment);
        pubsub.publish(`comment ${args.data.post}`, {
            comment : {
                mutation:'CREATED',
                data: comment
            }
        });

        return comment;
    },
    deleteComment(parent, args, {db,pubsub}, info) {
        const commentIndex = db.comments.findIndex(comment => comment.id === args.id);

        if(commentIndex === -1) throw new Error ("Comment does not exists");
        
        const [deletedComment]= db.comments.splice(commentIndex, 1);

        pubsub.publish(`comment ${deletedComment.post}`, {
            comment : {
                mutation:'DELETED',
                data: deletedComment
            }
        });
        return deletedComment;
    },
    updateComment(parent, args, {db,pubsub}, info){
        const {id, data} = args;

        const comment = db.comments.find((comment) => comment.id === id);
        
        if(!comment) {
            throw new Error ("User not found");
        }

        if(typeof data.text ==='string') {
            comment.text = data.text;
        }

        pubsub.publish(`comment ${comment.post}`, {
            comment : {
                mutation:'UPDATED',
                data: comment
            }
        });
        
        return comment;
    }
}

export {Mutation as default}