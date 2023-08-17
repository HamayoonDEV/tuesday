import Joi from "joi";
import fs from "fs";
import Blog from "../models/blog.js";
import { BACKEND_SERVER_PATH } from "../config/index.js";
import BlogDTO from "../DTO/blogDTO.js";
import BlogDetailsDto from "../DTO/blog-details-DTO.js";

const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
const blogController = {
  //create blog
  async createBlog(req, res, next) {
    //validate user input
    const blogCreateSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      photopath: Joi.string().required(),
      author: Joi.string().regex(mongoIdPattern).required(),
    });
    const { error } = blogCreateSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { title, content, photopath, author } = req.body;
    //read photo in buffer
    const buffer = Buffer.from(
      photopath.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
      "base64"
    );
    //allot random name
    const imagePath = `${Date.now()}-${author}.png`;
    //save localy
    try {
      fs.writeFileSync(`storage/${imagePath}`, buffer);
    } catch (error) {
      return next(error);
    }
    //save blog in database
    let blog;
    try {
      const blogTosave = new Blog({
        title,
        content,
        author,
        photopath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
      });
      blog = await blogTosave.save();
    } catch (error) {
      return next(error);
    }
    const blogDto = new BlogDTO(blog);
    //sending response
    res.status(201).json({ blog: blogDto });
  },

  //get all blogs method
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({}).populate("author");
      const BlogDto = [];
      for (let i = 0; i < blogs.length; i++) {
        const dto = new BlogDetailsDto(blogs[i]);
        BlogDto.push(dto);
      }

      return res.status(200).json({ blogs: BlogDto });
    } catch (error) {
      return next(error);
    }
  },
  //get blog by id method
  async getBlogById(req, res, next) {
    //validate id
    const getBlogByIdSchema = Joi.object({
      id: Joi.string().required(),
    });
    const { error } = getBlogByIdSchema.validate(req.params);
    if (error) {
      return next(error);
    }
    const { id } = req.params;
    let blog;
    try {
      blog = await Blog.findOne({ _id: id }).populate("author");
    } catch (error) {
      return next(error);
    }
    const blogDto = new BlogDetailsDto(blog);
    res.status(200).json({ Blog: blogDto });
  },
  //update blog method
  async updateBlog(req, res, next) {
    const updateBlogSchema = Joi.object({
      title: Joi.string(),
      content: Joi.string(),
      photopath: Joi.string(),
      author: Joi.string().regex(mongoIdPattern).required(),
      blogId: Joi.string().regex(mongoIdPattern).required(),
    });
    //validate update blog Schema
    const { error } = updateBlogSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { title, content, photopath, author, blogId } = req.body;
    let blog;
    try {
      blog = await Blog.findOne({ _id: blogId });
    } catch (error) {
      return next(error);
    }
    //delete photo
    if (photopath) {
      try {
        let previousPhoto = blog.photopath;
        previousPhoto = previousPhoto.split("/").at(-1);
        fs.unlinkSync(`storage/${previousPhoto}`);
      } catch (error) {
        return next(error);
      }
      //save new photo
      //read photo in buffer
      const buffer = Buffer.from(
        photopath.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
        "base64"
      );
      //allot random name
      const imagePath = `${Date.now()}-${author}.png`;
      //save localy
      try {
        fs.writeFileSync(`storage/${imagePath}`, buffer);
      } catch (error) {
        return next(error);
      }
      //update database
      try {
        await Blog.updateOne({
          title,
          content,
          photopath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
        });
      } catch (error) {
        return next(error);
      }
    } else {
      await Blog.updateOne({ title, content });
    }
    //sending response
    res.status(200).json({ message: "Blog is updated!!!" });
  },
  //delete method
  async delete(req, res, next) {
    const deleteSchema = Joi.object({
      id: Joi.string().regex(mongoIdPattern).required(),
    });
    const { error } = deleteSchema.validate(req.params);
    if (error) {
      return next(error);
    }
    const { id } = req.params;
    try {
      await Blog.deleteOne({ _id: id });
    } catch (error) {
      return next(error);
    }
    res.status(200).json({ message: "Blog has been Deleted!!!" });
  },
};

export default blogController;
