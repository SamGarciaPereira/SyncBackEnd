import user from "./user";
import password from "./password";
import { UnauthorizedError, ValidationError } from "../../infra/errors";

/**
 * Confere e-mail e senha. A mensagem de erro é a mesma para e-mail
 * inexistente e senha errada, para não revelar quais e-mails existem.
 */
async function login(email: string, providedPassword: string) {
  if (
    typeof email !== "string" ||
    typeof providedPassword !== "string" ||
    !email.trim() ||
    !providedPassword
  ) {
    throw new ValidationError({
      message: "Informe o e-mail e a senha.",
      action: "Preencha os dois campos para entrar.",
    });
  }

  const foundUser = await user.findByEmail(email);
  const passwordMatches = foundUser
    ? await password.compare(providedPassword, foundUser.password)
    : false;

  if (!foundUser || !passwordMatches) {
    throw new UnauthorizedError({
      message: "E-mail ou senha incorretos.",
      action: "Confira os dados digitados e tente novamente.",
    });
  }

  return await user.findById(foundUser.id);
}

const authentication = {
  login,
};

export default authentication;
