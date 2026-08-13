import React, { useState, useEffect, useRef } from "react";
import { View, TextInput, Text, TouchableOpacity, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from "react-native";
import { colors } from "./ui";
import { autocompleteInventory } from "../lib/api";
import { useAuth } from "../lib/auth-context";

interface AutocompleteSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (item: { id: string; name: string; unit: string }) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function AutocompleteSearch({
  value,
  onChangeText,
  onSelect,
  placeholder,
  containerStyle,
  inputStyle,
}: AutocompleteSearchProps) {
  const { auth } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<any>(null);

  // To prevent showing the dropdown immediately after a user selects an item
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setResults([]);
      setShowDropdown(false);
      setHasSearched(false);
      return;
    }

    if (selectedRef.current === value) {
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        if (!auth.token) return;
        const res = await autocompleteInventory(auth.token, value);
        setResults(res.slice(0, 5));
        setHasSearched(true);
      } catch (err) {
        console.error("Autocomplete search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [value, auth.token]);

  const handleSelect = (item: any) => {
    selectedRef.current = item.name;
    onChangeText(item.name);
    setShowDropdown(false);
    onSelect({ id: item.id, name: item.name, unit: item.unit });
  };

  const handleChange = (text: string) => {
    if (selectedRef.current && selectedRef.current !== text) {
      selectedRef.current = null;
    }
    onChangeText(text);
  };

  return (
    <View style={[{ zIndex: 50 }, containerStyle]}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        onFocus={() => {
          if (value && value.length >= 2 && selectedRef.current !== value) {
            setShowDropdown(true);
          }
        }}
        onBlur={() => {
          // slight delay so we can register the tap on the dropdown item
          setTimeout(() => setShowDropdown(false), 200);
        }}
        style={[
          {
            fontSize: 15,
            fontWeight: "700",
            color: colors.textMain,
            backgroundColor: "white",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
          },
          inputStyle,
        ]}
      />
      {showDropdown && (
        <View
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            marginTop: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
            zIndex: 100,
          }}
        >
          {loading ? (
            <View style={{ padding: 12, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSelect(item)}
                style={{
                  padding: 12,
                  borderBottomWidth: idx < results.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textMain }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {item.category || "General"} • {item.unit}
                </Text>
              </TouchableOpacity>
            ))
          ) : hasSearched ? (
            <View style={{ padding: 12, backgroundColor: "#F9FAFC", borderRadius: 8 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "700" }}>
                + Create new item
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
