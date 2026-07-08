class AppValidators {
  static final RegExp _emailRegExp = RegExp(
    r"^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*)@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$",
  );

  static bool isValidEmail(String value) => _emailRegExp.hasMatch(value.trim());

  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email is required';
    }
    if (!isValidEmail(value)) {
      return 'Enter a valid email address';
    }
    return null;
  }

  static bool hasMinLength(String value) => value.length >= 8;
  static bool hasUppercase(String value) => RegExp(r'[A-Z]').hasMatch(value);
  static bool hasLowercase(String value) => RegExp(r'[a-z]').hasMatch(value);
  static bool hasNumber(String value) => RegExp(r'\d').hasMatch(value);
  static bool hasSpecial(String value) => RegExp(r'[!@#$%^&*]').hasMatch(value);

  static int passwordStrengthScore(String value) {
    var score = 0;
    if (hasMinLength(value)) score++;
    if (hasUppercase(value)) score++;
    if (hasLowercase(value)) score++;
    if (hasNumber(value) || hasSpecial(value)) score++;
    return score.clamp(0, 4);
  }
}
