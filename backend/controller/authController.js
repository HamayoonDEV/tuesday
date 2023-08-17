import Joi from "joi";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import UserDTO from "../DTO/userDTO.js";
import JwtServices from "../services/JwtServices.js";
import RefreshToken from "../models/token.js";

const passwordPattren =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[ -/:-@\[-`{-~]).{6,64}$/;
const authController = {
  //register method
  async regiseter(req, res, next) {
    //validate user input by using joi
    const userRegisterSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattren).required(),
      confirmpassword: Joi.ref("password"),
    });
    //validate userRegiseterSchema
    const { error } = userRegisterSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { username, name, password, email } = req.body;

    //hashing password
    const hashedPassword = await bcrypt.hash(password, 10);
    //handle email and username confilct
    try {
      const emailInUse = await User.exists({ email });
      const usernameInUse = await User.exists({ username });

      if (emailInUse) {
        const error = {
          status: 409,
          message: "email is already in user please use anOther email!!!",
        };
        return next(error);
      }
      if (usernameInUse) {
        const error = {
          status: 409,
          message:
            "username is not available please choose anOther username!!!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //sava register in database
    let user;
    try {
      const userToRegister = new User({
        username,
        name,
        email,
        password: hashedPassword,
      });
      user = await userToRegister.save();
    } catch (error) {
      return next();
    }
    //genrate token
    const accessToken = JwtServices.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JwtServices.signRefreshToken({ _id: user._id }, "60m");
    //store refreshToken in database
    await JwtServices.storeRefreshToken(refreshToken, user._id);
    res.cookie("accesstoken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //sending response
    res.status(201).json({ user, auth: true });
  },
  //loging method
  async login(req, res, next) {
    //validation user input using joi
    const userLoginSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      password: Joi.string().pattern(passwordPattren).required(),
    });
    //validate userLoginSchema
    const { error } = userLoginSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { username, password } = req.body;
    let user;
    try {
      user = await User.findOne({ username });
      if (!user) {
        const error = {
          status: 401,
          message: "invaild Username!!!",
        };
        return next(error);
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        const error = {
          status: 401,
          message: "invalid password!!!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    const userDto = new UserDTO(user);
    const accessToken = JwtServices.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JwtServices.signRefreshToken({ _id: user._id }, "60m");
    //update refresh Token to databse
    await RefreshToken.updateOne(
      { _id: user._id },
      { token: refreshToken },
      { upsert: true }
    );
    //sending tokens to the cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //sending response
    res.status(200).json({ user: userDto, auth: true });
  },
  //logout
  async logout(req, res, next) {
    //feth refresh token from tokens
    const { refreshToken } = req.cookies;
    //delete it from data base
    try {
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }
    //clear the cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    //send response
    res.status(200).json({ user: null, auth: false });
  },
  //refresh method
  async refresh(req, res, next) {
    const originalRefreshToken = req.cookies.refreshToken;
    //verify refreshToken
    let _id;
    try {
      _id = JwtServices.verifyRefreshToken(originalRefreshToken)._id;
    } catch (e) {
      const error = {
        status: 401,
        message: "unAuthorized!!!",
      };
      return next(error);
    }
    try {
      //match refresh Token
      const match = await RefreshToken.findOne({
        _id: _id,
        token: originalRefreshToken,
      });
      if (!match) {
        const error = {
          status: 401,
          message: "UnAthurized!!!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //genrate tokens
    const accessToken = JwtServices.signAccessToken({ _id: _id }, "30m");
    const refreshToken = JwtServices.signRefreshToken({ _id: _id }, "60m");
    //update refresh Token in database
    await RefreshToken.updateOne({ _id: _id }, { token: refreshToken });
    //send tokens to the cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    const user = await User.findOne({ _id });
    const userDto = new UserDTO(user);
    res.status(200).json({ user: userDto, auth: true });
  },
};

export default authController;
