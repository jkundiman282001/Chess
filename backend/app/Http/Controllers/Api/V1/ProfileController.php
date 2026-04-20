<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $profile = $user->profile()->firstOrCreate();

        return response()->json([
            'profile' => [
                'username' => $user->username,
                'name' => $user->name,
                'bio' => $profile->bio,
                'country_code' => $profile->country_code,
                'avatar_path' => $profile->avatar_path,
                'ranked_rating' => $profile->ranked_rating,
                'highest_ranked_rating' => $profile->highest_ranked_rating,
                'experience' => $profile->experience,
                'level' => $profile->level,
                'soft_currency' => $profile->soft_currency,
            ],
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->profile()->firstOrCreate();

        $user->fill($request->safe()->only(['username', 'name']));
        $user->save();

        $profile->fill($request->safe()->only(['bio', 'country_code', 'avatar_path']));
        $profile->save();

        return response()->json([
            'message' => 'Profile updated.',
            'profile' => [
                'username' => $user->username,
                'name' => $user->name,
                'bio' => $profile->bio,
                'country_code' => $profile->country_code,
                'avatar_path' => $profile->avatar_path,
                'ranked_rating' => $profile->ranked_rating,
                'highest_ranked_rating' => $profile->highest_ranked_rating,
                'experience' => $profile->experience,
                'level' => $profile->level,
                'soft_currency' => $profile->soft_currency,
            ],
        ]);
    }
}
