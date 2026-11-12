// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = NOT_ENTERED;
    }

    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

interface IAccessControl {
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);
    error AccessControlBadConfirmation();
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address callerConfirmation) external;
}

pragma solidity ^0.8.20;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
abstract contract ERC165 is IERC165 {
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}
abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 role => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}


interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IEX is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}
interface IXEX is IERC20 {
    function lock(uint256 _amount) external;
}

contract ExInitialMintingGame is AccessControl, ReentrancyGuard {

    IEX public immutable EX;
    IXEX public immutable XEX;
    IERC20 public immutable XHUBBLE;
    IERC20 public immutable STS;

    address public immutable REDEMPTION_POOL;
   
    uint256 public constant DISCOUNT = 400;
    uint256 public constant OG_DISCOUNT = 1000;
    uint256 public constant BP = 10_000; 

    uint256 public constant discountsPerHubble = 1000;
    uint256 public constant PROTOCOL_STS = 66458e18;
    uint256 public constant OG_LIMIT = PROTOCOL_STS * 10;
    uint256 public constant HUBBLER_LIMIT = PROTOCOL_STS * 25;

    bool public mintingIsLive = false;

    // track tokens minted by both groups
    uint256 public ogMints = 0;
    uint256 public hubblerMints = 0;

    mapping (address=>uint256) public discountMintsByAddress;
    mapping (address=>uint256) public ogDiscountMintsByAddress;
    mapping (address=>bool) public isAnOG;

    modifier onlyAdmin {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not admin");
        _;
    }

    modifier onlyHubbler {
        require(XHUBBLE.balanceOf(msg.sender) >= 1e18, "Caller has less than 1 xHUBBLE");
        _;
    }

    modifier onlyOG {
        require(isAnOG[msg.sender],"not an og");
        _;
    }

    modifier onlyWhenLive() {
        require(mintingIsLive,"Minting is not live");
        _;
    }

    constructor(
        address _ex, 
        address _xex,
        address _sts,
        address _xhubble,
        address _redemptionPool
    ) {
        EX = IEX(_ex);
        STS = IERC20(_sts);
        REDEMPTION_POOL = _redemptionPool;
        XHUBBLE = IERC20(_xhubble);
        XEX = IXEX(_xex);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addOG(address og) public onlyAdmin {
        isAnOG[og] = true;
    }

    function addOGs(address[137] calldata ogs) public onlyAdmin {
        for (uint256 i = 0; i < 137; i++) {
            isAnOG[ogs[i]] = true;
        }
    }

    function enableMinting() external onlyAdmin {
        mintingIsLive = true;
    }

    function disableMinting() external onlyAdmin {
        mintingIsLive = false;
    }

    function hubblerRemainingDiscounts(address sender) public view returns (uint256) {
        uint256 staked = XHUBBLE.balanceOf(sender);
        uint256 discounts = discountMintsByAddress[sender];
        if (staked*discountsPerHubble > discounts) return staked*discountsPerHubble - discounts;
        else return 0;
    }
    function ogRemainingDiscounts(address sender) public view returns (uint256) {
        uint256 staked =  XHUBBLE.balanceOf(sender);
        uint256 discounts =  ogDiscountMintsByAddress[sender];
        if (staked*discountsPerHubble > discounts) return staked*discountsPerHubble - discounts;
        else return 0;
    }

    function stsRequired(uint256 amount) public pure returns (uint256) {
        return amount - amount * DISCOUNT / BP;
    }
    function stsRequiredOG(uint256 amount) public pure returns (uint256) {
        return amount - amount * OG_DISCOUNT / BP;
    }

    function _stsToRedemptionPool(address sender, uint256 amount) internal {
        require(STS.balanceOf(sender) >= amount, "sender does not have enough stS");
        require(STS.allowance(sender,address(this)) >=amount,"sender must increase allowance");
        STS.transferFrom(sender,REDEMPTION_POOL,amount);
    }

    function _mintXex(address to, uint256 amount, bool isOGmint) internal onlyWhenLive {
        if (isOGmint) {
            require(ogMints + amount <= OG_LIMIT,"OG Mint Capacity reached");
            ogMints+=amount;
        }
        else {
            require(hubblerMints + amount <= HUBBLER_LIMIT,"Hubbler Mint Capacity reached");
            hubblerMints+=amount;
        }
        EX.mint(address(this),amount);
        EX.approve(address(XEX),amount);
        XEX.lock(amount);
        XEX.transfer(to,amount);
    }

    function mintDiscount(uint256 amount) external onlyHubbler nonReentrant {
        require(amount >= 1e18, "must mint at least 1 EX");
        require(amount <= hubblerRemainingDiscounts(msg.sender), "user does not have enough remaining discounts");

        uint256 amountSts = stsRequired(amount); 
        discountMintsByAddress[msg.sender] += amount;

        _stsToRedemptionPool(msg.sender,amountSts);
        _mintXex(msg.sender,amount,false);
    }

    function og_mintDiscount(uint256 amount) external onlyOG nonReentrant {
        require(amount >= 1e18, "must mint at least 1 EX");
        require(amount <= ogRemainingDiscounts(msg.sender), "user does not have enough remaining discounts");

        uint256 amountSts = stsRequiredOG(amount); 
        ogDiscountMintsByAddress[msg.sender] += amount;

        _stsToRedemptionPool(msg.sender,amountSts);
        _mintXex(msg.sender,amount,true);
    }

    function _mintMaxDiscount() internal onlyHubbler {
        uint256 amount = hubblerRemainingDiscounts(msg.sender);
        require(amount >= BP, "you have no remaining mints");

        uint256 amountSts = stsRequired(amount); 
        discountMintsByAddress[msg.sender] += amount;

        _stsToRedemptionPool(msg.sender,amountSts);
        _mintXex(msg.sender,amount,false);
    }

    function _og_mintMaxDiscount() internal onlyOG {
        uint256 amount = ogRemainingDiscounts(msg.sender);
        require(amount >= BP, "you have no remaining mints");

        uint256 amountSts = stsRequiredOG(amount); 
        ogDiscountMintsByAddress[msg.sender] += amount;

        _stsToRedemptionPool(msg.sender,amountSts);
        _mintXex(msg.sender,amount,true);
    }

    function mintMaxDiscount() external nonReentrant {
        _mintMaxDiscount();
    }
    
    function og_mintMaxDiscount() external nonReentrant {
        _og_mintMaxDiscount();
    }

    function og_superMint() external nonReentrant {
        _mintMaxDiscount();
        _og_mintMaxDiscount();
    }
}