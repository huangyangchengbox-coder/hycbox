package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.WxRoleReq;
import com.hycbox.dto.req.WxSessionReq;
import com.hycbox.service.WxUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wx")
@RequiredArgsConstructor
public class WxController {

    private final WxUserService wxUserService;

    /** 小程序 wx.login code 换 openid，并返回上次角色 */
    @PostMapping("/session")
    public ApiResponse<?> session(@RequestBody WxSessionReq req) {
        String code = req == null ? null : req.getCode();
        return ApiResponse.ok(wxUserService.loginByCode(code));
    }

    /** 记住上次进入的角色：user / admin */
    @PutMapping("/role")
    public ApiResponse<?> updateRole(@RequestBody WxRoleReq req) {
        String openid = req == null ? null : req.getOpenid();
        String role = req == null ? null : req.getRole();
        wxUserService.updateLastRole(openid, role);
        return ApiResponse.ok(null);
    }
}
