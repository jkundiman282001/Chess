<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::query()->create([
            'username' => $request->string('username')->toString(),
            'name' => $request->string('name')->toString() ?: $request->string('username')->toString(),
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
        ]);

        $user->profile()->create();

        $token = $user->createToken($request->userAgent() ?: 'web-client')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUser($user->load('profile')),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $login = $request->string('login')->toString();
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $user = User::query()
            ->with('profile')
            ->where($field, $login)
            ->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials are incorrect.'],
            ]);
        }

        $deviceName = $request->string('device_name')->toString() ?: ($request->userAgent() ?: 'web-client');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out.',
        ]);
    }

    private function formatUser(User $user): array
    {
        $profile = $user->profile ?? $user->profile()->firstOrCreate();

        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'profile' => $profile ? [
                'bio' => $profile->bio,
                'country_code' => $profile->country_code,
                'avatar_path' => $profile->avatar_path,
                'ranked_rating' => $profile->ranked_rating,
                'highest_ranked_rating' => $profile->highest_ranked_rating,
                'experience' => $profile->experience,
                'level' => $profile->level,
                'soft_currency' => $profile->soft_currency,
            ] : null,
        ];
    }
}
