require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import userModel from "../models/userModel";
import ErrorHandler from "../utils/ErrorHandler";
import catchAsyncErrors from "../middleware/catchAsyncErrors";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exist", 400));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activationMail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Account Activation",
          template: "activationMail",
          data,
        });

        res.status(200).json({
          success: true,
          message:
            "Please check your email: " +
            user.email +
            " to activate your account",
          activationToken: activationToken.token,
        });
      } catch (err: any) {
        return next(new ErrorHandler(err.message, 400));
      }
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (
  user: IRegistrationBody
): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.JWT_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );

  return { token, activationCode };
};
