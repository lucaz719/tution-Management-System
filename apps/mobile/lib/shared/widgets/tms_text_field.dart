import 'package:flutter/material.dart';
import 'package:tms_mobile/core/theme/app_theme.dart';

class TMSTextField extends StatefulWidget {
  const TMSTextField({
    super.key,
    required this.controller,
    required this.labelText,
    this.hintText,
    this.keyboardType,
    this.validator,
    this.obscureText = false,
    this.enabled = true,
    this.textInputAction,
    this.onFieldSubmitted,
    this.maxLines = 1,
    this.prefixIcon,
  });

  final TextEditingController controller;
  final String labelText;
  final String? hintText;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final bool obscureText;
  final bool enabled;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onFieldSubmitted;
  final int maxLines;
  final IconData? prefixIcon;

  @override
  State<TMSTextField> createState() => _TMSTextFieldState();
}

class _TMSTextFieldState extends State<TMSTextField> {
  late bool _obscure;

  @override
  void initState() {
    super.initState();
    _obscure = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      keyboardType: widget.keyboardType,
      validator: widget.validator,
      obscureText: _obscure,
      enabled: widget.enabled,
      textInputAction: widget.textInputAction,
      onFieldSubmitted: widget.onFieldSubmitted,
      maxLines: widget.obscureText ? 1 : widget.maxLines,
      style: Theme.of(context).textTheme.bodyLarge,
      decoration: InputDecoration(
        labelText: widget.labelText,
        hintText: widget.hintText,
        prefixIcon: widget.prefixIcon == null ? null : Icon(widget.prefixIcon),
        prefixIconColor: kColorPrimaryLight,
        suffixIcon: widget.obscureText
            ? IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(_obscure
                    ? Icons.visibility_off_rounded
                    : Icons.visibility_rounded),
                tooltip: _obscure ? 'Show password' : 'Hide password',
              )
            : null,
      ),
    );
  }
}
