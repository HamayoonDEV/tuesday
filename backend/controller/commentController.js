import Joi from "joi";
import Comment from "../models/comments.js";
import CommentDTO from "../DTO/CommentDto.js";

const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
const commentController = {
  //create comments method
  async createComment(req, res, next) {
    //validate user input
    const createCommentSchema = Joi.object({
      content: Joi.string().required(),
      author: Joi.string().regex(mongoIdPattern).required(),
      blog: Joi.string().regex(mongoIdPattern).required(),
    });
    //validate createCommentSchema
    const { error } = createCommentSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { content, author, blog } = req.body;

    //save to database
    try {
      const newComment = new Comment({
        content,
        author,
        blog,
      });
      await newComment.save();
    } catch (error) {
      return next(error);
    }
    res.status(201).json({ message: "comment created!!!" });
  },
  //get comments by blogId method
  async getComments(req, res, next) {
    const getCommentsSchema = Joi.object({
      id: Joi.string().regex(mongoIdPattern).required(),
    });
    const { error } = getCommentsSchema.validate(req.params);
    if (error) {
      return next(error);
    }
    const { id } = req.params;
    let comments;
    try {
      comments = await Comment.find({ blog: id }).populate("author");
      const commentsDto = [];
      for (let i = 0; i < comments.length; i++) {
        const obj = new CommentDTO(comments[i]);
        commentsDto.push(obj);
      }
      return res.status(200).json({
        data: commentsDto,
      });
    } catch (error) {
      return next(error);
    }
  },
};

export default commentController;
