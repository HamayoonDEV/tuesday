import JWTservices from "../services/JwtServices.js";
import User from "../models/user.js";
import UserDTO from "../DTO/userDTO.js";

const auth = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;

  //varify tokens
  if (!refreshToken || !accessToken) {
    const error = {
      status: 401,
      message: "unAuthorized!!!",
    };
    return next(error);
  }

  //verifyAccess token use JWTservies class
  let _id;
  try {
    _id = await JWTservices.verifyAccessToken(accessToken)._id;
  } catch (error) {
    return next(error);
  }

  let user;
  try {
    user = await User.findOne({ _id });
  } catch (error) {
    return next(error);
  }

  const userDto = new UserDTO(user);
  req.user = userDto;
  next();
};

export default auth;
